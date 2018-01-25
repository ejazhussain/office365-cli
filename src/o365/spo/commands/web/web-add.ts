import auth from '../../SpoAuth';
import config from '../../../../config';
import commands from '../../commands';
import * as request from 'request-promise-native';
import GlobalOptions from '../../../../GlobalOptions';
import { ContextInfo, ClientSvcResponse, ClientSvcResponseContents } from '../../spo';
import {
  CommandOption,
  CommandValidate,
  CommandError,

} from '../../../../Command';
import SpoCommand from '../../SpoCommand';
import Auth from '../../../../Auth';
import Utils from '../../../../Utils';
import { PermissionKind, BasePermissions } from './../../common/base-permissions';
const vorpal: Vorpal = require('../../../../vorpal-init');

interface CommandArgs {
  options: Options;
}

interface Options extends GlobalOptions {
  title: string;
  webUrl: string;
  webTemplate: string;
  parentWebUrl: string;
  description?: string;
  locale?: string;
  breakInheritance: boolean;
  inheritNavigation: boolean;
}

class SpoWebAddCommand extends SpoCommand {
  // used to early break promises chain
  private static DONE: string = 'DONE';

  public get name(): string {
    return commands.WEB_ADD;
  }

  public get description(): string {
    return 'Create new subsite';
  }

  public getTelemetryProperties(args: CommandArgs): any {
    const telemetryProps: any = super.getTelemetryProperties(args);
    telemetryProps.description = (!(!args.options.description)).toString();
    telemetryProps.locale = args.options.locale || '1033';
    telemetryProps.breakInheritance = args.options.breakInheritance || false;
    telemetryProps.inheritNavigation = args.options.inheritNavigation || false;

    return telemetryProps;
  }

  public commandAction(cmd: CommandInstance, args: CommandArgs, cb: () => void): void {
    const resource: string = Auth.getResourceFromUrl(args.options.parentWebUrl);
    let siteAccessToken: string = '';
    let siteInfo: any = null;
    let subsiteFullUrl: string = '';

    auth
      .getAccessToken(resource, auth.service.refreshToken as string, cmd, this.debug)
      .then((accessToken: string): Promise<ContextInfo> => {
        siteAccessToken = accessToken;

        if (this.debug) {
          cmd.log(`Retrieved access token ${accessToken}. Retrieving request digest...`);
        }

        return this.getRequestDigestForSite(args.options.parentWebUrl, siteAccessToken, cmd, this.debug);
      })
      .then((res: ContextInfo): Promise<any> => {
        if (this.debug) {
          cmd.log('Response:')
          cmd.log(res);
          cmd.log('');
        }

        const requestOptions: any = {
          url: `${args.options.parentWebUrl}/_api/web/webinfos/add`,
          headers: Utils.getRequestHeaders({
            authorization: `Bearer ${siteAccessToken}`,
            'content-type': 'application/json;odata=nometadata',
            accept: 'application/json;odata=nometadata',
            'X-RequestDigest': res.FormDigestValue
          }),
          json: true,
          body: {
            parameters: {
              Url: args.options.webUrl,
              Title: args.options.title,
              Description: args.options.description,
              Language: args.options.locale,
              WebTemplate: args.options.webTemplate,
              UseUniquePermissions: args.options.breakInheritance
            }
          }
        };

        if (this.debug) {
          cmd.log('Executing web request...');
          cmd.log(requestOptions);
          cmd.log('');
        }

        if (this.verbose) {
          cmd.log(`Creating subsite ${args.options.parentWebUrl}/${args.options.webUrl}...`);
        }

        return request.post(requestOptions)
      })
      .then((res: any): Promise<any> => {
        if (this.debug) {
          cmd.log('Response:')
          cmd.log(res);
          cmd.log('');
        }

        siteInfo = res;

        if (!args.options.inheritNavigation) {
          return Promise.reject(SpoWebAddCommand.DONE);
        }

        if (this.verbose) {
          cmd.log("Setting inheriting navigation from the parent site...");
        }

        subsiteFullUrl = `${args.options.parentWebUrl}/${encodeURIComponent(args.options.webUrl)}`;

        const requestOptions: any = {
          url: `${subsiteFullUrl}/_api/web/effectivebasepermissions`,
          headers: Utils.getRequestHeaders({
            authorization: `Bearer ${siteAccessToken}`,
            accept: 'application/json;odata=nometadata'
          }),
          json: true
        };

        if (this.debug) {
          cmd.log('Executing web request...');
          cmd.log(requestOptions);
          cmd.log('');
        }

        return request.get(requestOptions);
      })
      .then((res: any): Promise<ContextInfo> => {
        if (this.debug) {
          cmd.log('Response:')
          cmd.log(res);
          cmd.log('');
        }

        const permissions: BasePermissions = new BasePermissions();
        permissions.high = res.High as number;
        permissions.low = res.Low as number;

        if (this.debug) {
          cmd.log("WebEffectiveBasePermission")
          cmd.log(res);
          cmd.log('');
        }

        /// Detects if the site in question has no script enabled or not. 
        /// Detection is done by verifying if the AddAndCustomizePages permission is missing.
        /// 
        /// See https://support.office.com/en-us/article/Turn-scripting-capabilities-on-or-off-1f2c515f-5d7e-448a-9fd7-835da935584f
        /// for the effects of NoScript
        if (!permissions.has(PermissionKind.AddAndCustomizePages)) {
          if (this.verbose) {
            cmd.log("No script is enabled. Skipping the InheritParentNavigation settings.");
          }

          return Promise.reject(SpoWebAddCommand.DONE);
        }

        return this.getRequestDigestForSite(subsiteFullUrl, siteAccessToken, cmd, this.debug);
      })
      .then((res: ContextInfo): Promise<any> => {
        if (this.debug) {
          cmd.log('Response:')
          cmd.log(res);
          cmd.log('');
        }

        const requestOptions: any = {
          url: `${subsiteFullUrl}/_vti_bin/client.svc/ProcessQuery`,
          headers: Utils.getRequestHeaders({
            authorization: `Bearer ${siteAccessToken}`,

            'X-RequestDigest': res.FormDigestValue
          }),
          body: `<Request xmlns="http://schemas.microsoft.com/sharepoint/clientquery/2009" SchemaVersion="15.0.0.0" LibraryVersion="16.0.0.0" ApplicationName="${config.applicationName}"><Actions><ObjectPath Id="1" ObjectPathId="0" /><ObjectPath Id="3" ObjectPathId="2" /><ObjectPath Id="5" ObjectPathId="4" /><SetProperty Id="6" ObjectPathId="4" Name="UseShared"><Parameter Type="Boolean">true</Parameter></SetProperty></Actions><ObjectPaths><StaticProperty Id="0" TypeId="{3747adcd-a3c3-41b9-bfab-4a64dd2f1e0a}" Name="Current" /><Property Id="2" ParentId="0" Name="Web" /><Property Id="4" ParentId="2" Name="Navigation" /></ObjectPaths></Request>`
        };

        if (this.debug) {
          cmd.log('Executing web request...');
          cmd.log(requestOptions);
          cmd.log('');
        }

        return request.post(requestOptions)
      })
      .then((res: any): void => {
        if (this.debug) {
          cmd.log('Response:');
          cmd.log(res);
          cmd.log('');
        }

        const json: ClientSvcResponse = JSON.parse(res);
        const response: ClientSvcResponseContents = json[0];
        if (response.ErrorInfo) {
          cmd.log(new CommandError(response.ErrorInfo.ErrorMessage));
        }
        else {
          cmd.log(siteInfo);

          if (this.verbose) {
            cmd.log(vorpal.chalk.green('DONE'));
          }
        }
        cb();
      }, (err: any): void => {
        if (err === SpoWebAddCommand.DONE) {
          cmd.log(siteInfo);

          if (this.verbose) {
            cmd.log(vorpal.chalk.green('DONE'));
          }

          cb();
          return;
        }

        if (err.error &&
          err.error['odata.error'] &&
          err.error['odata.error'].message) {
          cmd.log(new CommandError(err.error['odata.error'].message.value));
        }
        else {
          if (err instanceof Error) {
            cmd.log(new CommandError(err.message));
          }
          else {
            cmd.log(new CommandError(err));
          }
        }

        cb();
      });
  }

  public options(): CommandOption[] {
    const options: CommandOption[] = [
      {
        option: '-t, --title <title>',
        description: 'Subsite title'
      },
      {
        option: '-d, --description [description]',
        description: 'Subsite description'
      },
      {
        option: '-u, --webUrl <webUrl>',
        description: 'Subsite relative url'
      },
      {
        option: '-w, --webTemplate <webTemplate>',
        description: 'Subsite template, eg. STS#0 (Classic team site)'
      },
      {
        option: '-p, --parentWebUrl <parentWebUrl>',
        description: 'URL of the parent site under which to create the subsite'
      },
      {
        option: '-l, --locale [locale]',
        description: 'Subsite locale LCID, eg. 1033 for en-US. Default 1033'
      },
      {
        option: '--breakInheritance',
        description: 'Set to not inherit permissions from the parent site'
      },
      {
        option: '--inheritNavigation',
        description: 'Set to inherit the navigation from the parent site'
      }
    ];

    const parentOptions: CommandOption[] = super.options();
    return options.concat(parentOptions);
  }

  public validate(): CommandValidate {
    return (args: CommandArgs): boolean | string => {

      if (!args.options.title) {
        return 'Required option title missing';
      }

      if (!args.options.webUrl) {
        return 'Required option webUrl missing';
      }

      if (!args.options.webTemplate) {
        return 'Required option webTemplate missing';
      }

      if (!args.options.parentWebUrl) {
        return 'Required option parentWebUrl missing';
      }
      else {
        const isValidSharePointUrl: boolean | string = SpoCommand.isValidSharePointUrl(args.options.parentWebUrl);
        if (isValidSharePointUrl !== true) {
          return isValidSharePointUrl;
        }
      }

      if (args.options.locale) {
        const locale: number = parseInt(args.options.locale);
        if (isNaN(locale)) {
          return `${args.options.locale} is not a valid locale number`;
        }
      }

      return true;
    };
  }

  public commandHelp(args: {}, log: (help: string) => void): void {
    const chalk = vorpal.chalk;
    log(vorpal.find(this.name).helpInformation());
    log(
      `  ${chalk.yellow('Important:')} before using this command, connect to a SharePoint Online site,
      using the ${chalk.blue(commands.CONNECT)} command.

    Remarks:
    
      To create a subsite, you have to first connect to SharePoint using the
      ${chalk.blue(commands.CONNECT)} command, eg. ${chalk.grey(`${config.delimiter} ${commands.CONNECT} https://contoso.sharepoint.com`)}.
    
    Examples:
    
      Create subsite using the ${chalk.grey('Team site')} template in the ${chalk.grey('en-US')} locale
        ${chalk.grey(config.delimiter)} ${commands.WEB_ADD} --title Subsite --description Subsite --webUrl subsite --webTemplate STS#0 --parentWebUrl https://contoso.sharepoint.com --locale 1033

      Create subsite with unique permissions using the default ${chalk.grey('en-US')} locale
        ${chalk.grey(config.delimiter)} ${commands.WEB_ADD} --title Subsite --webUrl subsite --webTemplate STS#0 --parentWebUrl https://contoso.sharepoint.com --breakInheritance

      Create subsite with the same navigation as the parent site
        ${chalk.grey(config.delimiter)} ${commands.WEB_ADD} --title Subsite --webUrl subsite --webTemplate STS#0 --parentWebUrl https://contoso.sharepoint.com --inheritNavigation
  ` );
  }
}

module.exports = new SpoWebAddCommand();