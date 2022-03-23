FROM denoland/deno:debian as build

WORKDIR /app

RUN apt update
RUN apt install unzip

COPY . .

RUN deno compile --allow-ffi --allow-env --allow-run --allow-read --allow-write --unstable --target x86_64-unknown-linux-gnu --output ./argrep ./main.ts

FROM debian:latest as final

RUN apt update
RUN apt install -y libarchive-dev libmagic-dev grep xz-utils

COPY --from=build /app/argrep /usr/local/bin/argrep

ENTRYPOINT ["/usr/local/bin/argrep", "--libarchive", "/usr/lib/x86_64-linux-gnu/libarchive.so", "--libmagic", "/usr/lib/x86_64-linux-gnu/libmagic.so"]