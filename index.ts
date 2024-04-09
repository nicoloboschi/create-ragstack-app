#!/usr/bin/env node
/* eslint-disable import/no-extraneous-dependencies */
import { cyan, green, red, yellow, bold, blue } from 'picocolors'
import Commander from 'commander'
import Conf from 'conf'
import path from 'path'
import prompts from 'prompts'
import type { InitialReturnValue } from 'prompts'
import checkForUpdate from 'update-check'
import { updateApp } from './update-app'
import { getPackageManager } from './helpers/package-manager'
import packageJson from './package.json'
import fs from 'fs'

let projectPath: string = ''

const handleSigTerm = () => process.exit(0)

process.on('SIGINT', handleSigTerm)
process.on('SIGTERM', handleSigTerm)

const onPromptState = (state: {
    value: InitialReturnValue
    aborted: boolean
    exited: boolean
}) => {
    if (state.aborted) {
        // If we don't re-enable the terminal cursor before exiting
        // the program, the cursor will remain hidden
        process.stdout.write('\x1B[?25h')
        process.stdout.write('\n')
        process.exit(1)
    }
}

const command = new Commander.Command()
command.name(packageJson.name)
    .version(packageJson.version)
    .arguments('<project-directory>')
    .usage(`${green('<project-directory>')} [options]`)
    .action((name) => {
        projectPath = name
    })
    .option(
        '--use-npm',
        `

  Explicitly tell the CLI to bootstrap the application using npm
`
    )
    .option(
        '--use-pnpm',
        `

  Explicitly tell the CLI to bootstrap the application using pnpm
`
    )
    .option(
        '--use-yarn',
        `

  Explicitly tell the CLI to bootstrap the application using Yarn
`
    );

command.parse(process.argv)
const program = command.opts()

const packageManager = !!program.useNpm
    ? 'npm'
    : !!program.usePnpm
        ? 'pnpm'
        : !!program.useYarn
            ? 'yarn'
            : getPackageManager()

async function run(): Promise<void> {
    if (typeof projectPath === 'string') {
        projectPath = projectPath.trim()
    }

    if (!projectPath) {
        console.log(
            '\nPlease specify the project directory:\n' +
            `  ${cyan(program.name())} ${green('<project-directory>')}\n` +
            'For example:\n' +
            `  ${cyan(program.name())} ${green('my-ragstack-app')}\n\n` +
            `Run ${cyan(`${program.name()} --help`)} to see all options.`
        )
        process.exit(1)
    }
    const packageJsonPath = path.join(projectPath, 'package.json')
    if (!fs.existsSync(packageJsonPath)) {
        console.log(
            `\nPlease initialize the project at ${cyan(projectPath)} with your favourite package manager.`
        )
        process.exit(1)
    }

    const resolvedProjectPath = path.resolve(projectPath)
    await updateApp({
        appPath: resolvedProjectPath,
        packageManager
    })
}

const update = checkForUpdate(packageJson).catch(() => null)

async function notifyUpdate(): Promise<void> {
    try {
        const res = await update
        if (res?.latest) {
            const updateMessage =
                packageManager === 'yarn'
                    ? 'yarn global add create-ragstack-app'
                    : packageManager === 'pnpm'
                        ? 'pnpm add -g create-ragstack-app'
                        : 'npm i -g create-ragstack-app'

            console.log(
                yellow(bold('A new version of `create-ragstack-app` is available!')) +
                '\n' +
                'You can update by running: ' +
                cyan(updateMessage) +
                '\n'
            )
        }
        process.exit()
    } catch {
        // ignore error
    }
}

run()
    // .then(notifyUpdate)
    .catch(async (reason) => {
        console.log()
        console.log('Aborting installation.')
        if (reason.command) {
            console.log(`  ${cyan(reason.command)} has failed.`)
        } else {
            console.log(
                red('Unexpected error. Please report it as a bug:') + '\n',
                reason
            )
        }
        console.log()

        // await notifyUpdate()

        process.exit(1)
    })