#!/bin/sh
set -eu

# Keep the original rig as the source. Compression never overwrites it.
# Run from the project root. Pin the converter for reproducible settings.
avatar_workdir=$(mktemp -d "${TMPDIR:-/tmp}/jansewak-avatar.XXXXXX")
bunx @gltf-transform/cli@4.5.0 webp public/avatar-lady.glb "$avatar_workdir/avatar-webp.glb" --quality 90
bunx @gltf-transform/cli@4.5.0 meshopt "$avatar_workdir/avatar-webp.glb" public/avatar-lady-optimized.glb --quantize-position 16 --quantize-normal 12
