# argrep - run grep recursively on archives

Crude and quick implementation of a tool to run `grep` recursively through
archives.

A successor of https://github.com/sarpt/avfsgrep, which used `avfs` as a quick
way to solve archive-handling business-logic. With `libarchive` usable with FFI
in `deno` there's no need to use `avfsgrep` anymore (if anything, issues with
FUSE in docker images make `argrep` way easier to use than `avfsgrep` which is
dependent on `avfs` FUSE-based implementation).

### execution example

Run...

`deno run --unstable --allow-ffi --allow-env --allow-read --allow-write --allow-run main.ts </path/to/dir or /path/to/archive> -r <grep regex> [-- <grep options>]`

... or install/compile:

- `deno install --unstable --allow-ffi --allow-env --allow-read --allow-write --allow-run main.ts`

- `deno compile --unstable --allow-ffi --allow-env --allow-read --allow-write --allow-run main.ts`

and then run

`argrep </path/to/dir or /path/to/archive> -e <grep regex> [-- <grep options>]`

### docker

Provided Dockerfile compiles `argrep` binary using debian variant of deno docker
image and prepares a debian environment with all necessary dependencies met.
It's the preferred way of running this tool since it has all dependencies and
library paths provided/ensured during image build process.

Example usage (ran from the directory where `Dockerfile` is):

- `docker build . -t argrep:latest`
- `docker run -it --rm -v /path/to/directory/with/archives/on/local/machine:/mnt argrep:latest -e pattern /mnt/filename`

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

- `-e, --e` : (list) regex pattern for `grep` and its variants. It's mandatory
  to provide at least one.
- `-i, --i` : input file. Mandatory, unless unnamed arguments before `--`
  provided. Ignored when unnamed arguments before `--` provided.
- `--pe` : (list) path regexe patterns. Accepts JS regexp patterns.
- `--fe` : (list) filename regexe patterns. Accepts JS regexp patterns.
- `-v` : verbose logging. `false` by default.
- `--ignore-invalid-regex` : do not exit when invalid regex pattern encountered.
  Invalid regexes are ignored, but correct ones are tested. `false` by default.
- `--ee` : (list) extension regexe patterns. Accepts JS regexp patterns.
- `--libarchive`: path to libarchive library. When not provided,
  `/usr/lib/libarchive.so` is used by default.
- `--libmagic`: path to libmagic library. When not provided,
  `/usr/lib/libmagic.so` is used by default.

### unnamed arguments

- before `--` - arguments (multiple) are treated as root path to
  directory/archive to be checked recursively.
- after `--` - arguments (multiple) are passed to `grep` as is.
