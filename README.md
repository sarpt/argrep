# argrep - run grep recursively on archives

Crude and quick implementation of a tool to run `grep` recursively through
archives.

An extension (or fork, or variant) of https://github.com/sarpt/avfsgrep

### execution example

Run...

`deno run --unstable --allow-ffi --allow-env --allow-read --allow-write --allow-run main.ts </path/to/dir or /path/to/archive> -r <grep regex> [-- <grep options>]`

... or install/compile:

- `deno install --unstable --allow-ffi --allow-env --allow-read --allow-write --allow-run main.ts`

- `deno compile --unstable --allow-ffi --allow-env --allow-read --allow-write --allow-run main.ts`

and then run

`argrep </path/to/dir or /path/to/archive> -r <grep regex> [-- <grep options>]`

### docker

Provided Dockerfile compiles `argrep` binary using debian variant of deno docker
image and prepares a debian environment with all necessary dependencies met.
It's the preferred way of running this tool since it has all dependencies and
library paths provided/ensured during image build process.

Example usage (ran from the directory where `Dockerfile` is):

- `docker build . -t argrep:latest`
- `docker run -it --rm -v /path/to/directory/with/archives/on/local/machine:/mnt argrep:latest -r file /mnt/filename`

When running the docker image `libmagic` and `libarchive` arguments are
provided/hardcoded in the Dockerfile and there's no need to provide them again.

### dependencies for running

- `deno` - tested on 1.17.1 and up
- `grep` - just a grep
- `xzgrep`/`lzgrep` - for xz/lzma archives
- `libmagic` - for files format deduction
- `libarchive` - for archives handling

### permissions

- `unstable` & `allow-ffi` - for FFI (format deduction using `libmagic`, archive
  extraction using `libarchive`)
- `allow-env` - for reading home and tmp directory path
- `allow-read` - for reading directories and files
- `allow-run` - for executing `grep`, `xzgrep` & `lzgrep`
- `allow-write` - for archives extraction with `libarchive` to descend into
  archives recursively

### arguments

- `-i, --i` : input file (ignored when unnamed arguments before `--` provided)
- `-r, --r` : regex for `grep` and its variants
- `--pr` : (list) path regexes
- `--fr` : (list) filename regexes
- `-v` : verbose logging
- `--er` : (list) extension regexes
- `--libarchive`: path to libarchive library. When not provided,
  `/usr/lib/libarchive.so` is used by default
- `--libmagic`: path to libmagic library. When not provided,
  `/usr/lib/libmagic.so` is used by default

### unnamed arguments

- before `--` - arguments (multiple) are treated as root path to
  directory/archive to be checked recursively.
- after `--` - arguments (multiple) are passed to `grep` as is.
