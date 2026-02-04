#!/bin/bash

set -euo pipefail
# make clean


unset GMP_EM_DIR
unset MPC_EM_DIR
unset MPFR_EM_DIR

# MIN_SAIL_VERSION="0.17.1"
MIN_EMCC_32_VERSION="3.1.5"
MIN_EMCC_64_VERSION="4.0.3"
MIN_EMAR_32_VERSION="13.0.1"
MIN_EMAR_64_VERSION="21.0.0"
ARCHITECTURE=""                    # Required
CACHE_PATH=""                      # Required
GMP_EM_DIR=""                      # Required
MPC_EM_DIR=""                      # Required
MPFR_EM_DIR=""                     # Required
# TARGET=""                          # Required

POSITIONAL=()




usage() {
  cat <<'EOF'
Use:
  assembler_sail.sh RV64 ~/emscripten_cache [GMP_EM_DIR] [MPC_EM_DIR] [MPFR_EM_DIR]
  assembler_sail.sh --arch RV64 --cache /emcc/cache/path [--gmp-dir /gmp/dir/path]
  assembler_sail.sh RV64 /emcc/cache/path [--gmp-dir /gmp/dir/path]
  assembler_sail.sh --arch RV64 [--gmp-dir /gmp/dir/path]
  assembler_sail.sh RV64  --cache /emcc/cache/path [--gmp-dir /gmp/dir/path]
Examples:
  ./assembler_sail.sh --arch RV64 /emcc/cache /opt/gmp /opt/mpc /opt/mpfr
  ./assembler_sail.sh RV64 --cache /emcc/cache /opt/gmp /opt/mpc /opt/mpfr 
  ./assembler_sail.sh --arch RV64 --cache /emcc/cache/path --gmp-dir /opt/gmp --mpc-dir /opt/mpc --mpfr-dir /opt/mpfr
EOF
}


while [[ $# -gt 0 ]]; do
  case "$1" in
    --arch)
      ARCHITECTURE="${2:-}"; shift 2 ;;
    --cache)
      CACHE_PATH="${2:-}"; shift 2 ;;
    --gmp-dir|--gmp|--gmp_path)
      GMP_EM_DIR="${2:-}"; shift 2 ;;
    --mpc-dir|--mpc|--mpc_path)
      MPC_EM_DIR="${2:-}"; shift 2 ;;
    --mpfr-dir|--mpfr|--mpfr_path)
      MPFR_EM_DIR="${2:-}"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    --*)
      echo "Unknown option: $1"
      usage
      exit 1 ;;
    *)
      POSITIONAL+=("$1"); shift ;;
  esac
done



if [[ -z "$ARCHITECTURE" && ${#POSITIONAL[@]} -ge 1 ]]; then
  ARCHITECTURE="${POSITIONAL[0]}"
fi
if [[ -z "$GMP_EM_DIR" && ${#POSITIONAL[@]} -ge 2 ]]; then
  GMP_EM_DIR="${POSITIONAL[1]}"
fi
if [[ -z "$MPC_EM_DIR" && ${#POSITIONAL[@]} -ge 3 ]]; then
  MPC_EM_DIR="${POSITIONAL[2]}"
fi
if [[ -z "$MPFR_EM_DIR" && ${#POSITIONAL[@]} -ge 4 ]]; then
  MPFR_EM_DIR="${POSITIONAL[3]}"
fi



if [[ -z "$ARCHITECTURE" || -z "$GMP_EM_DIR" || -z "$MPC_EM_DIR" || -z "$MPFR_EM_DIR" ]]; then
  echo "Not enough arguments"
  usage
  exit 1
fi

case "$ARCHITECTURE" in
  RV32|RV64) ;;
  *) echo "Invalid architecture: $ARCHITECTURE (use RV32 o RV64)"; exit 1 ;;
esac




get_emcc_version() {
    local out
    out="$(emcc -v 2>&1 || true)"

    local ver
    ver="$(printf '%s\n' "$out" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)"

    if [ -z "$ver" ]; then 
        echo "emcc version cannot be detected. Complete out:"
        echo "$out"
        return 1
    fi
    printf '%s' "$ver"
}

get_emar_version() {
  echo "getting emar version"
  local out
  out="$(emar -V 2>&1 || true)"

  local ver
  ver="$(printf '%s\n' "$out" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -n1)"

  if [ -z "$ver" ]; then 
    echo "emar version cannot be detected. Complete out:"
    echo "$out"
    return 1
  fi
  printf '%s' "$ver"

}

version_check() {
    local have="$1"
    local min="$2"
    [ "$(printf '%s\n'  "$min" "$have" | sort -V | head -n1)" = "$min" ]
}



# Check requirements 
echo "Checking dependencies..."

GMP_OK=false

if [[ -n "$GMP_EM_DIR" ]]; then
  GMP_EM_DIR="${GMP_EM_DIR%/}"

  if [[ ! -f "$GMP_EM_DIR/include/gmp.h" ]]; then
    echo "gmp.h not found at $GMP_EM_DIR/include/gmp.h"
    exit 1
  fi

  # lib o lib64
  if [[ -f "$GMP_EM_DIR/lib/libgmp.a" || -f "$GMP_EM_DIR/lib/libgmp.so" ]]; then
    # export CFLAGS="${CFLAGS:-} -I$GMP_EM_DIR/include"
    # export LDFLAGS="${LDFLAGS:-} -L$GMP_EM_DIR/lib"
    echo "GMP using --gmp-dir: $GMP_EM_DIR (lib)"
    GMP_OK=true
  else
    echo "libgmp not found at $GMP_EM_DIR/lib either at $GMP_EM_DIR/lib64"
    exit 1
  fi
fi

# 1) Si no se pasó ruta, intenta pkg-config
if [[ "$GMP_OK" = false ]] && command -v pkg-config >/dev/null 2>&1; then
  if pkg-config --exists gmp; then
    echo "GMP found via pkg-config"
    # export GMP_CFLAGS
    # export GMP_LIBS
    # GMP_CFLAGS="$(pkg-config --cflags gmp)"
    # GMP_LIBS="$(pkg-config --libs gmp)"
    GMP_OK=true
  fi
fi

# 2) Si sigue sin estar, intenta sistema
if [[ "$GMP_OK" = false ]]; then
  if ldconfig -p 2>/dev/null | grep -q libgmp; then
    echo "GMP found on system (ldconfig)"
    GMP_OK=true
  fi
fi

if [[ "$GMP_OK" = false ]]; then
  echo "Error: GMP lib not found"
  exit 1
fi

MPC_OK=false

if [[ -n "$MPC_EM_DIR" ]]; then
  MPC_EM_DIR="${MPC_EM_DIR%/}"

  if [[ ! -f "$MPC_EM_DIR/include/mpc.h" ]]; then
    echo "mpc.h not found at $MPC_EM_DIR/include/mpc.h"
    exit 1
  fi

  # lib o lib64
  if [[ -f "$MPC_EM_DIR/lib/libmpc.a" || -f "$MPC_EM_DIR/lib/libmpc.la" ]]; then
    # export CFLAGS="${CFLAGS:-} -I$GMP_EM_DIR/include"
    # export LDFLAGS="${LDFLAGS:-} -L$GMP_EM_DIR/lib"
    echo "MPC using --mpc-dir: $MPC_EM_DIR (lib)"
    MPC_OK=true
  else
    echo "libmpc not found at $MPC_EM_DIR/lib either at $MPC_EM_DIR/lib64"
    exit 1
  fi
fi

# 1) Si no se pasó ruta, intenta pkg-config
if [[ "$MPC_OK" = false ]] && command -v pkg-config >/dev/null 2>&1; then
  if pkg-config --exists mpc; then
    echo "MPC found via pkg-config"
    # export GMP_CFLAGS
    # export GMP_LIBS
    # GMP_CFLAGS="$(pkg-config --cflags gmp)"
    # GMP_LIBS="$(pkg-config --libs gmp)"
    MPC_OK=true
  fi
fi

# 2) Si sigue sin estar, intenta sistema
if [[ "$MPC_OK" = false ]]; then
  if ldconfig -p 2>/dev/null | grep -q libmpc; then
    echo "MPC found on system (ldconfig)"
    MPC_OK=true
  fi
fi

if [[ "$MPC_OK" = false ]]; then
  echo "Error: MPC lib not found"
  exit 1
fi

MPFR_OK=false

if [[ -n "$MPFR_EM_DIR" ]]; then
  MPFR_EM_DIR="${MPFR_EM_DIR%/}"

  if [[ ! -f "$MPFR_EM_DIR/include/mpfr.h" ]]; then
    echo "mpfr.h not found at $MPFR_EM_DIR/include/mpfr.h"
    exit 1
  fi

  # lib o lib64
  if [[ -f "$MPFR_EM_DIR/lib/libmpfr.a" || -f "$MPFR_EM_DIR/lib/libmpfr.la" ]]; then
    # export CFLAGS="${CFLAGS:-} -I$MPFR_EM_DIR/include"
    # export LDFLAGS="${LDFLAGS:-} -L$MPFR_EM_DIR/lib"
    echo "MPFR using --mpfr-dir: $MPFR_EM_DIR (lib)"
    MPFR_OK=true
  else
    echo "libmpfr not found at $MPFR_EM_DIR/lib either at $MPFR_EM_DIR/lib64"
    exit 1
  fi
fi

# 1) Si no se pasó ruta, intenta pkg-config
if [[ "$MPFR_OK" = false ]] && command -v pkg-config >/dev/null 2>&1; then
  if pkg-config --exists mpfr; then
    echo "MPFR found via pkg-config"
    # export GMP_CFLAGS
    # export GMP_LIBS
    # GMP_CFLAGS="$(pkg-config --cflags gmp)"
    # GMP_LIBS="$(pkg-config --libs gmp)"
    MPFR_OK=true
  fi
fi

# 2) Si sigue sin estar, intenta sistema
if [[ "$MPFR_OK" = false ]]; then
  if ldconfig -p 2>/dev/null | grep -q mpfr; then
    echo "MPFR found on system (ldconfig)"
    MPFR_OK=true
  fi
fi

if [[ "$MPFR_OK" = false ]]; then
  echo "Error: MPFR lib not found"
  exit 1
fi




EMCC_OK=false 

if command -v emcc >/dev/null 2>&1; then
    echo "emcc founded $(command -v emcc)"
    EMCC_OK=true
fi

if [ "$EMCC_OK" = false ]; then
    echo "Error: Emscripten (emcc) not installed or not activated."
    echo
    echo "Please install it through apt-get or via emsdk"
    echo
    exit 1
fi


EMCC_VERSION="$(get_emcc_version)"

#check which arch are
if [ "$ARCHITECTURE" == "RV32" ]; then
    echo "RISC-V 32 bits architecture selected"
    if ! version_check "$EMCC_VERSION" "$MIN_EMCC_32_VERSION"; then
        echo "emcc >= $MIN_EMCC_32_VERSION required (detected $EMCC_VERSION)"
        exit 1
    fi
    
elif [ "$ARCHITECTURE" == "RV64" ]; then
    echo "RISC-V 64 bits architecture selected"
    if ! version_check "$EMCC_VERSION" "$MIN_EMCC_64_VERSION"; then
        echo "emcc >= $MIN_EMCC_64_VERSION required (detected $EMCC_VERSION)"
        exit 1
    fi
else 
    echo "Error: None architecture version are selected or undefined architecture: $ARCHITECTURE"
    echo "Please select one architecture variant (RV32 or RV64) to generate the architecture simulator"
    echo "Use ./assembler_sail.sh -h or ./assembler_sail.sh --help for more information"
    exit 1
fi


EMAR_OK=false

if command -v emar >/dev/null 2>&1; then
  echo "emar founded $(command -v emar)"
  EMAR_OK=true
fi

if [ "$EMAR_OK" = false ]; then

  echo "Error: Emscripten (emar) not installed or not activated."
  echo
  echo "Please install it through apt-get or via emsdk"
  echo
  exit 1
fi


EMAR_VERSION="$(get_emar_version)"

#check which arch are
if [ "$ARCHITECTURE" = "RV64" ]; then
    echo "RISC-V 64 bits architecture selected"
    if ! version_check "$EMAR_VERSION" "$MIN_EMAR_64_VERSION"; then
        echo "emar >= $MIN_EMAR_64_VERSION required (detected $EMAR_VERSION)"
        exit 1
    fi
elif [ "$ARCHITECTURE" = "RV32" ]; then
    echo "RISC-V 32 bits architecture selected"
    if ! version_check "$EMAR_VERSION" "$MIN_EMAR_32_VERSION"; then
        echo "emar >= $MIN_EMAR_32_VERSION required (detected $EMAR_VERSION)"
        exit 1
    fi
else 
    echo "Error: None architecture version are selected or undefined architecture: $ARCHITECTURE"
    echo "Please select one architecture variant (RV32 or RV64) to generate the architecture simulator"
    echo "Use ./assembler_sail.sh -h or ./assembler_sail.sh --help for more information"
    exit 1
fi


# Gen Sail simulator
echo "$ARCHITECTURE"
echo "$GMP_EM_DIR"
echo "$MPC_EM_DIR"
echo "$MPFR_EM_DIR"
echo "$EMCC_VERSION"
echo "$EMAR_VERSION"
# export GMP_EM_DIR
export CC=emcc
export CXX=em++
export AR=emar
export RANLIB=emranlib
export EXEEXT=.wasm

mkdir -p toolchain_build/binaries

if [ "$CACHE_PATH" != "" ]; then
  export EM_CACHE=$CACHE_PATH
fi

if [[ "$ARCHITECTURE" = "RV64" ]]; then
  echo "Compile RISC-V 64 bits architecture on web environment"
  cp Makefile64.in Makefile.in
  make clean
  export CFLAGS="-flto -O0 -g -s SAFE_HEAP=1 -s EXIT_RUNTIME=1 -s EXPORTED_RUNTIME_METHODS=['FS','run'] -s INVOKE_RUN=0 -s ALLOW_MEMORY_GROWTH=1 -s MEMORY64=1 -s MODULARIZE=1 -s EXPORT_ES6=1"
  emconfigure ./configure --host=wasm64-wasi --with-gmp="$GMP_EM_DIR" \
                          --with-mpfr="$MPFR_EM_DIR" --with-mpc="$MPC_EM_DIR" \
                          --with-gcc-src=$(pwd)/gcc \
                          --with-binutils-src=$(pwd)/binutils \
                          --with-newlib-src=$(pwd)/newlib \
                          --with-glibc-src=$(pwd)/glibc \
                          --with-musl-src=$(pwd)/musl \
                          --with-gdb-src=$(pwd)/gdb \
                          --with-qemu-src=$(pwd)/qemu \
                          --with-spike-src=$(pwd)/spike \
                          --with-pk-src=$(pwd)/pk \
                          --with-llvm-src=$(pwd)/llvm \
                          --with-dejagnu-src=$(pwd)/dejagnu \
                          --with-linux-headers-src=$(pwd)/linux-headers \
                          --without-system-zlib --with-host=wasm64-unknown-emscripten \
                          --disable-gdb \
                          --prefix=$(pwd)/toolchain_build \
                          --with-arch=rv64gc --with-abi=lp64d
  make build-binutils V=1 --trace -j1
  cp build-binutils-newlib/gas/as-new.js toolchain_build/binaries/as-new64.js
  npx jscodeshift -t ./toolchain_build/transform-as64.js ./toolchain_build/binaries/as-new64.js
  cp build-binutils-newlib/gas/as-new.wasm toolchain_build/binaries/as-new64.wasm
  cp build-binutils-newlib/ld/ld-new.js toolchain_build/binaries/ld-new64.js
  npx jscodeshift -t ./toolchain_build/transform-ld64.js ./toolchain_build/binaries/ld-new64.js
  cp build-binutils-newlib/ld/ld-new.wasm toolchain_build/binaries/ld-new64.wasm
  cp build-binutils-newlib/binutils/objdump.js toolchain_build/binaries/objdump64.js
  npx jscodeshift -t ./toolchain_build/transform-objdump64.js ./toolchain_build/binaries/objdump64.js
  cp build-binutils-newlib/binutils/objdump.wasm toolchain_build/binaries/objdump64.wasm
elif [[ "$ARCHITECTURE" = "RV32" ]]; then
  echo "Compile RISC-V 32 bits architecture on web environment"
  cp Makefile32.in Makefile.in
  make clean
  export CFLAGS="-flto -O0 -g -s FORCE_FILESYSTEM=1 -s SAFE_HEAP=1 -s INVOKE_RUN=0 -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXIT_RUNTIME=1 -s EXPORTED_RUNTIME_METHODS=['FS'] -s ALLOW_MEMORY_GROWTH=1"
  emconfigure ./configure --host=wasm32-wasi --with-gmp=GMP_EM_DIR \
                          --with-mpfr=MPFR_EM_DIR --with-mpc=MPC_EM_DIR \
                          --with-gcc-src=$(pwd)/gcc \
                          --with-binutils-src=$(pwd)/binutils \
                          --with-newlib-src=$(pwd)/newlib \
                          --with-glibc-src=$(pwd)/glibc \
                          --with-musl-src=$(pwd)/musl \
                          --with-gdb-src=$(pwd)/gdb \
                          --with-qemu-src=$(pwd)/qemu \
                          --with-spike-src=$(pwd)/spike \
                          --with-pk-src=$(pwd)/pk \
                          --with-llvm-src=$(pwd)/llvm \
                          --with-dejagnu-src=$(pwd)/dejagnu \
                          --with-linux-headers-src=$(pwd)/linux-headers \
                          --without-system-zlib --with-host=wasm32-unknown-emscripten \
                          --disable-gdb \
                          --prefix=$(pwd)/toolchain_build \
                          --with-arch=rv32gc --with-abi=ilp32d 
  make build-binutils V=1 --trace -j1 
  cp build-binutils-newlib/gas/as-new.js toolchain_build/binaries/as-new.js
  npx jscodeshift -t ./toolchain_build/transform-as32.js ./toolchain_build/binaries/as-new.js
  cp build-binutils-newlib/gas/as-new.wasm toolchain_build/binaries/as-new.wasm
  cp build-binutils-newlib/ld/ld-new.js toolchain_build/binaries/ld-new.js
  npx jscodeshift -t ./toolchain_build/transform-ld32.js ./toolchain_build/binaries/ld-new.js
  cp build-binutils-newlib/ld/ld-new.wasm toolchain_build/binaries/ld-new.wasm
  cp build-binutils-newlib/binutils/objdump.js toolchain_build/binaries/objdump.js
  npx jscodeshift -t ./toolchain_build/transform-objdump32.js ./toolchain_build/binaries/objdump.js
  cp build-binutils-newlib/binutils/objdump.wasm toolchain_build/binaries/objdump.wasm
else
  echo "Nothing to compile"
fi
