import { Arguments } from './arguments';
import { EventEmitter } from 'events';
import { Filesystem } from '../filesystem';
import { ParserFactory } from '../parsers/parser-factory';
import { ProcessFactory } from './process';
import { TestCase } from '../parsers/parser';

export enum State {
    PHPUNIT_GIT_FILE = 'phpunit_git_file',
    PHPUNIT_NOT_FOUND = 'phpunit_not_found',
    PHPUNIT_EXECUTE_ERROR = 'phpunit_execute_error',
    PHPUNIT_NOT_TESTCASE = 'phpunit_not_testcase',
    PHPUNIT_NOT_PHP = 'phpunit_not_php',
}

interface Options {
    basePath?: string;
    execPath?: string;
}

export class PHPUnit extends EventEmitter {
    constructor(
        private parserFactory = new ParserFactory(),
        private processFactory: ProcessFactory = new ProcessFactory(),
        private files: Filesystem = new Filesystem()
    ) {
        super();
    }

    handle(path: string, args: string[], options: Options = {}): Promise<TestCase[]> {
        const basePath: string = options.basePath || __dirname;
        const execPath: string = options.execPath || '';
        const cwd: string = this.files.isFile(path) ? this.files.dirname(path) : path;
        const parameters = new Arguments(args);

        return new Promise((resolve, reject) => {
            if (parameters.has('--teamcity') === false) {
                parameters.put('--log-junit', this.files.tmpfile(`vscode-phpunit-junit-${new Date().getTime()}.xml`));
            }

            if (parameters.has('-c') === false) {
                parameters.put('-c', this.getConfiguration(cwd, basePath) || false);
            }

            const spawnOptions = [this.getExecutable(execPath, cwd, basePath)]
                .concat(parameters.toArray())
                .concat([path]);

            this.emit('start', `${spawnOptions.join(' ')}\n\n`);
            this.processFactory
                .create()
                .on('stdout', (buffer: Buffer) => this.emit('stdout', buffer))
                .on('stderr', (buffer: Buffer) => this.emit('stderr', buffer))
                .spawn(spawnOptions, {
                    cwd: basePath,
                })
                .then(output => {
                    this.emit('exit', output);
                    const parser = this.parserFactory.create(parameters.has('--teamcity') ? 'teamcity' : 'junit');
                    const content = parameters.has('--teamcity') ? output : parameters.get('--log-junit');
                    parser
                        .parse(content)
                        .then(items => {
                            if (parameters.has('--log-junit')) {
                                this.files.unlink(parameters.get('--log-junit'));
                            }
                            resolve(items);
                        })
                        .catch(error => reject(error));
                });
        });
    }

    private getConfiguration(cwd: string, basePath: string): string {
        return this.files.findUp(['phpunit.xml', 'phpunit.xml.dist'], cwd, basePath);
    }

    private getExecutable(execPath: string, cwd: string, basePath: string): string {
        const path: string = this.files.findUp(
            [execPath, `vendor/bin/phpunit`, `phpunit.phar`, 'phpunit'].filter(path => path !== ''),
            cwd,
            basePath
        );

        if (!path) {
            throw State.PHPUNIT_NOT_FOUND;
        }

        return path;
    }
}
