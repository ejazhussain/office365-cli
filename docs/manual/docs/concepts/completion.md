# Command completion

To help you use its commands, the Office 365 CLI offers you the ability to autocomplete commands and options that you're typing in the prompt. Depending how you're using the Office 365 CLI, some additional setup might be required to enable command completion.

## Immersive mode

One way to use the Office 365 CLI is to start it in the immersive mode. By typing in your shell `o365` or `office365`, you start the Office 365 CLI and your command prompt changes to `o365$`. At that point, the Office 365 CLI takes over your shell and interprets all of your input. To complete the command you're typing, simply start typing the word and press `TAB`. To see the list of available commands, matching your input, press `TAB` twice.

## Non-immersive mode

When using the Office 365 CLI in the non-immersive mode, you execute complete Office 365 CLI commands in your shell. Rather than starting the Office 365 CLI by typing `o365` or `office365`, you type the whole command, like `o365 spo app list`. Also when running in non-immersive mode, the Office 365 CLI offers you support for completing your input. The configuration steps required to enable command completion, depend on which operating system and shell you're using.

### Clink (cmder)

On Windows, the Office 365 CLI offers support for completing commands in [cmder](http://cmder.net) and other shells using [Clink](https://mridgers.github.io/clink/).

#### Enable Clink completion

To enable completion:

1. Start your shell
1. Change the working directory to where your shell stores completion plugins. For cmder, it's `%CMDER_ROOT%\vendor\clink-completions`, where `%CMDER_ROOT%` is the folder where you installed cmder.
1. Execute: `o365 --completion:clink:generate > o365.lua`. This will create the `o365.lua` file with information about o365 commands which is used by Clink to provide completion
1. Restart your shell

You should now be able to complete your input, eg. typing `o365 s<tab>` will complete it to `o365 spo` and typing `o365 spo <tab><tab>` will list all SharePoint Online commands available in Office 365 CLI. To see the options available for the current command, type `-<tab><tab>`, for example `o365 spo app list -<tab><tab>` will list all options available for the `o365 spo app list` command.

#### Disable Clink completion

To disable completion, delete the `o365.lua` file you generated previously and restart your shell.

#### Update Clink completion

Command completion is based on a static file. After updating the Office 365 CLI, you should update the completion file as described in the [Enable completion](#enable-clink-completion) section so that the completion file reflects the latest commands in the Office 365 CLI.

### Zsh, Bash and Fish

If you're using Zsh, Bash or Fish as your shell, you can benefit of Office 365 CLI command completion as well, when typing commands directly in the shell. The completion is based on the [Omelette](https://www.npmjs.com/package/omelette) package.

#### Enable sh completion

To enable completion:

1. Start your shell
1. Execute `o365 --completion:sh:setup`. This will generate the `commands.json` file in the same folder where the Office 365 CLI is installed, listing all available commands and their options. Additionally, it will register completion in your shell profile file (for Zsh `~/.zshrc`) using the [Omelette's automated install](https://www.npmjs.com/package/omelette#automated-install).
1. Restart your shell

You should now be able to complete your input, eg. typing `o365 s<tab>` will complete it to `o365 spo` and typing `o365 spo <tab><tab>` will list all SharePoint Online commands available in Office 365 CLI. To see the options available for the command, type `-<tab><tab>`, for example `o365 spo app list -<tab><tab>` will list all options available for the `o365 spo app list` command. If the command is completed, the completion will automatically start suggestions with a `-` indicating that you have matched a command and can now specify its options. Command options you've already used are removed from the suggestions list, but the completion doesn't take into account short and long variant of the same option. If you specified the `--output` option in your command, `--option` will not be displayed in the list of suggestions, but `-o` will.

#### Disable sh completion

To disable completion, edit your shell's profile file (for Zsh `~/.zshrc`) and remove the following lines:

```sh
# begin o365 completion
. <(o365 --completion)
# end o365 completion
```

Save the profile file and restart the shell for the changes to take effect.

#### Update sh completion

Command completion is based on the static `commands.json` file located in the folder where the Office 365 CLI is installed. After updating the Office 365 CLI, you should update the completion file by executing `o365 --completion:sh:generate` in the command line. After running this command, it's not necessary to restart the shell to see the latest changes.