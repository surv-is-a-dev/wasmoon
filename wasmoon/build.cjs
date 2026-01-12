const path = require('path');
const dirname = path.resolve(path.dirname(__filename), '..');

const process = require('process');
const { exec, execFile } = require('child_process');

const isDev = process.env.NODE_ENV !== 'production';

function execAndLink(useExecFile, cmd_or_file, args_or_options, options_or_none) {
  return new Promise((resolve, reject) => {
    if (useExecFile) {
      return execFile(cmd_or_file, args_or_options ?? [], options_or_none ?? {}, (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }
        stdout.pipe(process.stdout);
        stderr.pipe(process.stderr);
      }).on('close', (exit_code) => process.exitCode = exit_code);
    }
    return exec(cmd_or_file, args_or_options ?? {}, (error, stdout, stderr) => {
      if (error) {
        return reject(error);
      }
      stdout.pipe(process.stdout);
      stderr.pipe(process.stderr);
    }).on('close', (exit_code) => process.exitCode = exit_code);
  });
  stdout.pipe(process.stdout);
}

if ((process.env.ENV_WITH_DOCKER || '') == 0) {
  execAndLink(
    false,
    path.join(dirname, 'build.sh') + (isDev ? ' dev' : ''),
    {
      input: 'pipe',
      cwd: dirname,
      shell: true,
      windowsHide: true,
    },
  );
} else {
  execAndLink(
    true,
    'docker',
    [
      'run',
      '--rm',
      '-e', `ENV_WASM_NODEFS=${process.env.ENV_WASM_NODEFS == 0 ? '0' : '1'}`,
      '--mount', `type=volume,src=${JSON.stringify(path.posix.normalize(dirname)).slice(1, -1)},dst=/wasmoon`,
      'emscripten/emsdk',
      '/wasmoon/build.sh',
    ].concat(isDev ? ['dev'] : []),
    {
      input: 'pipe',
      cwd: dirname,
      shell: false,
      windowsHide: true,
    },
  );
}
