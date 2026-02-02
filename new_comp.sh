#/bin/bash
make clean
# export WASI_SDK_PATH=/home/juancarlos/Descargas/wasi-sdk-24.0-x86_64-linux

# export CC="$WASI_SDK_PATH/bin/clang"
# export CXX="$WASI_SDK_PATH/bin/clang++"
# export AR="$WASI_SDK_PATH/bin/ar"
# export RANLIB="$WASI_SDK_PATH/bin/ranlib"


export CC=emcc
export CXX=em++
export AR=emar
export RANLIB=emranlib
export EXEEXT=.wasm
# export CFLAGS="-plugin /home/juancarlos/riscv/libexec/gcc/riscv64-unknown-linux-gnu/13.2.0/liblto_plugin.so"
# export CFLAGS="--sysroot=$WASI_SDK_PATH/share/wasi-sysroot -flto"
# export CXXFLAGS="--sysroot=$WASI_SDK_PATH/share/wasi-sysroot"
# export CPPFLAGS="-I home/juancarlos/Descargas/wasi-libc/sysroot/include/wasm32-wasi"

# ./configure --host=wasm32-wasi --with-gmp=/home/juancarlos/Descargas/gmp-6.2.1/gmp-emscripten \
#                         --with-mpfr=/home/juancarlos/Descargas/mpfr-4.2.1/mpfr-install --with-mpc=/home/juancarlos/Descargas/mpc-1.3.1/mpc-install \
#                         --with-binutils-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/binutils \
#                         --with-linux-headers-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/linux-headers \
#                         --without-system-zlib --with-host=wasm32-wasi \
#                         --disable-gdb \
#                         --prefix=/home/juancarlos/Escritorio/new_toolchain \ 
                        # CFLAGS="-s NO_FILESYSTEM=1 -s ENVIRONMENT=web"
# Generar compilador para wasm32
# export CFLAGS="-flto -O0 -g -s FORCE_FILESYSTEM=1 -s SAFE_HEAP=1 -s INVOKE_RUN=0 -s MODULARIZE=1 -s EXPORT_ES6=1 -s EXIT_RUNTIME=1 -s EXPORTED_RUNTIME_METHODS=['FS'] -s ALLOW_MEMORY_GROWTH=1"
# emconfigure ./configure --host=wasm32-wasi --with-gmp=/home/juancarlos/Descargas/gmp-6.3.0/gmp-emscripten32 \
#                         --with-mpfr=/home/juancarlos/Descargas/mpfr-4.2.1/mpfr-install --with-mpc=/home/juancarlos/Descargas/mpc-1.3.1/mpc-install \
#                         --with-gcc-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/gcc \
#                         --with-binutils-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/binutils \
#                         --with-newlib-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/newlib \
#                         --with-glibc-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/glibc \
#                         --with-musl-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/musl \
#                         --with-gdb-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/gdb \
#                         --with-qemu-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/qemu \
#                         --with-spike-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/spike \
#                         --with-pk-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/pk \
#                         --with-llvm-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/llvm \
#                         --with-dejagnu-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/dejagnu \
#                         --with-linux-headers-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/linux-headers \
#                         --without-system-zlib --with-host=wasm32-unknown-emscripten \
#                         --disable-gdb \
#                         --prefix=/home/juancarlos/Escritorio/new_toolchain \
#                         --with-arch=rv32gc --with-abi=ilp32d 

# Generar compilador para wasm64
export CFLAGS="-flto -O0 -g -s SAFE_HEAP=1 -s EXIT_RUNTIME=1 -s EXPORTED_RUNTIME_METHODS=['FS','run'] -s INVOKE_RUN=0 -s ALLOW_MEMORY_GROWTH=1 -s MEMORY64=1 -s MODULARIZE=1 -s EXPORT_ES6=1"
emconfigure ./configure --host=wasm64-wasi --with-gmp=/home/juancarlos/newlibgmp \
                        --with-mpfr=/home/juancarlos/mpfrwasm64/mpfr-4.2.1/mpfr-install --with-mpc=/home/juancarlos/mpcwasm64/mpc-1.3.1/mpc-install \
                        --with-gcc-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/gcc \
                        --with-binutils-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/binutils \
                        --with-newlib-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/newlib \
                        --with-glibc-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/glibc \
                        --with-musl-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/musl \
                        --with-gdb-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/gdb \
                        --with-qemu-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/qemu \
                        --with-spike-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/spike \
                        --with-pk-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/pk \
                        --with-llvm-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/llvm \
                        --with-dejagnu-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/dejagnu \
                        --with-linux-headers-src=/home/juancarlos/Escritorio/prueba/creator-compiler-toolchain/linux-headers \
                        --without-system-zlib --with-host=wasm64-unknown-emscripten \
                        --disable-gdb \
                        --prefix=/home/juancarlos/Escritorio/new_toolchain \
                        --with-arch=rv64gc --with-abi=lp64d
                        #--with-arch=rv32gc --with-abi=ilp32d 


make build-binutils V=1 --trace -j1 
# ./configure --prefix=/home/juancarlos/Escritorio/new_toolchain
# make -j10
