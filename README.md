CREATOR-SAIL-ASSEMBLER
=============================
This repo contains the implementation of the toolchain used to assemble, link and disassemble programs coded in assembly to RISC-V architectures. Also, it is a implementation based on the repository of the toolchain developed by RISC-V organization (See more information [here](https://github.com/riscv-collab/riscv-gnu-toolchain)). 

With this implementation, the toolchain is generated to be executed in web environments. Specially, was adapted to be run in the new version of CREATOR simulator, including a more professional compiler for generating files to be run in these simulator or download it to run programs in real RISC-V architectures. The content of the repository are coded in C/C++, but we only focus on the implementation of the encoding of the RISC-V instructions.

#  Requirements

To use the repo, the user need to install previously the following tools:

- **Emscripten/Emsdk**, a transpiler from high and low level language code to Web Environments.
- **MPFR**, a multiple-precision floating point library.
- **MPC**, an arithmetic of complex numbers library.
- **GMP**, an arithmetic multiple precision library.

All of these tools requiere a minimum version to be used in this project. For both variants of the simulator needs a transpiler to convert the implementation from a high or low level code into a format to be run in Web Environments. Also the version of the libraries compiled to web environments (*MPC*, *MPFR* and *GMP*), needs to be the latest. For MPC, needs to be *1.3.1* version; for MPFR, needs to be *4.2.2* version; and for GMP, needs to be the *6.3.0* version. These libraries were downloaded and compiled through emscripten to be applied in compilation process for the web compiler.

To generate the compiler, Emscripten was used to transpile the code for generating a compiler executable in web environment. For the 32-bit version of the web compiler, needs an specific version of Emscripten (*3.1.5* for *emcc*, and *13.0.1* for *emar*); for the 64-bit version of the web compiler, needs an specific version of the transpiler, and the recommendation is use Emsdk to get it (*4.0.3* for *emcc*, and *21.0.0* for *emar*).

Now it will show how to install each tool for the web compiler.


### Transpiler from high and low level code to Web environments (Emscripten/Emsdk)

To 32-bit version, the instalation process are the following:

```
sudo apt-get install emscripten

# Check emcc (minimum 3.1.5) and emar (minimum 13.0.1) version

emcc -v
emar -V
```

To 64-bit version, the installation process are a bit longer than 32-bit version, and is the following:


```
# First get the emsdk repository and enter that directory
git clone https://github.com/emscripten-core/emsdk.git
cd emsdk

# Fetch the latest version of the emsdk
git pull

# Download and install the SDK tools  (recommended 4.0.3 but can download/install the latest).
./emsdk install 4.0.3 # ./emsdk install latest 

# Make the "4.0.3/latest" SDK "active" for the current user. (writes .emscripten file)
./emsdk activate 4.0.3 # ./emsdk activate latest

# Activate PATH and other environment variables in the current terminal
# Also, if the user want, can be added to startup scripts

source ./emsdk_env.sh

# Finally check version for emcc (4.0.3) and emar (21.0.0)

emcc -v
emar -V
```
### GNU Multiple Precision Arithmetic Library (GMP)

First, need to download the version of the lib from this url: https://gmplib.org/#DOWNLOAD

Unzip it and inside on the repo, the following steps needs to be executed:

First create a directory for the build (just for a clean compilation process)

```
mkdir -p gmp_build
cd gmp-6.3.0
```

Now, the user must to configure different parameters:

```
export CFLAGS="-O3"
export CXXFLAGS="-O3"
```

To generate the library for Emscripten, the user must to use their commands to generate the compiled library for web environments (*emconfigure*, emscripten version of the *configure* command, and *emmake*, emscripten version of the *make* command)

```
emconfigure ../configure \
  --prefix="$(pwd)/../gmp_build" \
  --disable-assembly \
  --enable-static \
  --disable-shared

# Once configure process finished lets make and install the new library on the prefix directory

emmake make
emmake make install
```

Finally check at the prefix directory if the library was succesfully installed.

**Note**: To each variant of the simulator, the user must to generate a version of the library. The reason is that the 64-bit variant of the simulator needs to use 64-bit extension in memory and the default version of Emscripten was optimized to use 32-bit version. So in 64-bit version must to enable the 64-bit flag (MEMORY64).


### MPFR

**NOTE**: Previously to compile this library for be applied in other projects, the user needs to compile to web environments GMP.

First, need to download the version of the lib from this [url](https://www.mpfr.org/mpfr-current/#download)

Unzip it and inside on the repo, the following steps needs to be executed:

First create a directory for the build (just for a clean compilation process)

```
mkdir -p mpfr_build
cd mpfr-4.2.2
```

Now, the user must to configure different parameters:

```
export CPPFLAGS="-I$GMP_BUILD_DIR/include"
export LDFLAGS="-L$GMP_BUILD_DIR/lib"
export CFLAGS="-O3"
export CXXFLAGS="-O3"
```

To generate the library for Emscripten, the user must to use their commands to generate the compiled library for web environments (*emconfigure*, emscripten version of the *configure* command, and *emmake*, emscripten version of the *make* command)

```
emconfigure ./configure \
  --prefix="$(pwd)/../mpfr_build" \
  --host=none \
  --with-gmp="$GMP_BUILD_DIR" \
  --enable-static --disable-shared

# Once configure process finished lets make and install the new library on the prefix directory

emmake make
emmake make install
```

Finally check at the prefix directory if the library was succesfully installed.

**Note**: To each variant of the simulator, the user must to generate a version of the library. The reason is that the 64-bit variant of the simulator needs to use 64-bit extension in memory and the default version of Emscripten was optimized to use 32-bit version. So in 64-bit version must to enable the 64-bit flag (MEMORY64).


### MPC


**NOTE**: Previously to compile this library for be applied in other projects, the user needs to compile to web environments GMP and MPFR.

First, need to download the version of the lib from this [url](https://www.multiprecision.org/mpc/download.html)

Unzip it and inside on the repo, the following steps needs to be executed:

First create a directory for the build (just for a clean compilation process)

```
mkdir -p mpc_build
cd mpc-1.3.1
```

Now, the user must to configure different parameters:

```
export CPPFLAGS="-I$GMP_BUILD_DIR/include \
                 -I$MPFR_BUILD_DIR/include"
export LDFLAGS="-L$GMP_BUILD_DIR/lib \
                -L$MPFR_BUILD_DIR/lib"
```

To generate the library for Emscripten, the user must to use their commands to generate the compiled library for web environments (*emconfigure*, emscripten version of the *configure* command, and *emmake*, emscripten version of the *make* command)

```
emconfigure ./configure \
  --prefix="$(pwd)/../mpc_build" \
  --with-gmp="$GMP_BUILD_DIR" \
  --with-mpfr="$MPFR_BUILD_DIR" \
  --disable-shared --enable-static \
  --host=none

# Once configure process finished lets make and install the new library on the prefix directory

emmake make
emmake make install
```

Finally check at the prefix directory if the library was succesfully installed.

**Note**: To each variant of the simulator, the user must to generate a version of the library. The reason is that the 64-bit variant of the simulator needs to use 64-bit extension in memory and the default version of Emscripten was optimized to use 32-bit version. So in 64-bit version must to enable the 64-bit flag (MEMORY64).




# How to build it


Once all the necessary tools for generating the web compiler have been installed, a script will be used for this purpose. The script is called *assembler_sail.sh* that there is at the root of the source code, and the script requires a series of parameters to be passed to it in order to generate the compiler.


RISC-V Variant that wants to generate:

```
RV32 / RV64
```

Cache directory for emscripten compilation process (required for 32-bit architecture)

```
/path/emscripten/cache
# The path of emscripten cache is at the emscripten source code 
```

GMP dir to use during the transpilation process
```
/gmp/build/path
```


MPFR dir to use during the transpilation process
```
/mpfr/build/path
```

MPC dir to use during the transpilation process
```
/mpc/build/path
```
There are the different examples to use the script:
```
./assembler_sail.sh --arch RV64 /emcc/cache /opt/gmp /opt/mpc /opt/mpfr
./assembler_sail.sh RV64 --cache /emcc/cache /opt/gmp /opt/mpc /opt/mpfr 
./assembler_sail.sh --arch RV64 --cache /emcc/cache/path --gmp-dir /opt/gmp --mpc-dir /opt/mpc --mpfr-dir /opt/mpfr

  ```



# Output generated

Once is transpiled and generated our compiler, the output was stored at *toolchain_build/binaries* directory of the source code.

This can be applied on our CREATOR project to introduce a new custom compiler with new instructions that the user has introduced.

It is important to notice that if the user wants to introduce new instructions to compile and execute into the simulator, the user needs to introduce this new encoded instruction into the implementation of the simulator and generate a new version of the simulator. The reason is that the simulator does not automatically updated when inserts a new instruction into the compiler.
