/**
 * jscodeshift transform (text-based): NOMBRES INVERTIDOS
 * Convierte el fichero que ahora tienes como /mnt/data/deseado.js
 * al contenido del que ahora tienes como /mnt/data/original.js
 *
 * Run:
 *   npx jscodeshift -t transform.js /mnt/data/deseado.js > /mnt/data/salida.js
 *   diff -u /mnt/data/salida.js /mnt/data/original.js
 */

function mustReplace(src, from, to, label) {
  if (!src.includes(from)) {
    throw new Error(`Pattern not found for: ${label}`);
  }
  return src.replace(from, to);
}

module.exports = function transformer(fileInfo) {
  let src = fileInfo.source.replace(/\r\n/g, "\n");

  // 1) Insert "let ofile = null;" at top if missing
  if (!src.startsWith("let ofile = null;\n")) {
    src = src.replace(/^\uFEFF?/, "let ofile = null;\n");
  }

  // 2) wasm rename: as-new.wasm -> as-new64.wasm (all occurrences)
  src = src.replaceAll("as-new.wasm", "as-new64.wasm");

  // 3) exitJS: add ofile read/log right after function header
  src = mustReplace(
    src,
    `/** @suppress {duplicate } */ /** @param {boolean|number=} implicit */ var exitJS = (status, implicit) => {\n  EXITSTATUS = status;`,
    `/** @suppress {duplicate } */ /** @param {boolean|number=} implicit */ var exitJS = (status, implicit) => {\n  ofile = FS.readFile("./out.o");\n  console.log(ofile);\n  EXITSTATUS = status;`,
    "exitJS add ofile read/log"
  );

  // 4) callMain try: add ofile read/log after entryFunction
  src = mustReplace(
    src,
    `  try {\n    var ret = entryFunction(argc, BigInt(argv));\n    // if we're not running an evented main loop, it's time to exit`,
    `  try {\n    var ret = entryFunction(argc, BigInt(argv));\n    ofile = FS.readFile("./out.o");\n    console.log(ofile);\n    // if we're not running an evented main loop, it's time to exit`,
    "callMain try add ofile read/log"
  );

  // 5) callMain catch: add ofile read/log
  src = mustReplace(
    src,
    `  } catch (e) {\n    return handleException(e);\n  }`,
    `  } catch (e) {\n    ofile = FS.readFile("./out.o");\n    console.log(ofile);\n    return handleException(e);\n  }`,
    "callMain catch add ofile read/log"
  );

  // 6) run(): comment dependenciesFulfilled assignment in first guard
  src = mustReplace(
    src,
    `  if (runDependencies > 0) {\n    dependenciesFulfilled = run;\n    return;\n  }`,
    `  if (runDependencies > 0) {\n    // dependenciesFulfilled = run;\n    return;\n  }`,
    "run(): comment dependenciesFulfilled in first guard"
  );

  // 7) doRun(): inject asm_files block after initRuntime(); and comment readyPromiseResolve
  src = mustReplace(
    src,
    `    initRuntime();\n    preMain();\n    readyPromiseResolve(Module);\n    Module["onRuntimeInitialized"]?.();`,
    `    initRuntime();\n    var asm_files = args.pop();\n    for (let i = 0; i < asm_files.length; i ++ ){\n      FS.writeFile('./'+asm_files[i].name, asm_files[i].code);\n      args.push('./'+asm_files[i].name);\n    }\n    // for(var i = 2; i < args.length; i++) {\n    //   FS.writeFile('./code' + (i - 2) + '.s', args[i]);\n    //   args[i] = 'code' + (i - 2) + '.s';\n    // }\n    args = [\"-o\",\"out.o\", ...args, /*\"-march=rv64imfdv\", \"-mabi=lp64d\", \"code.s\"*/];\n    preMain();\n    // readyPromiseResolve(Module);\n    Module[\"onRuntimeInitialized\"]?.();`,
    "doRun(): inject asm_files + comment readyPromiseResolve"
  );

  // 8) run(): revert conditional callMain back to direct callMain(args);
  src = mustReplace(
    src,
    `    if (!noInitialRun) callMain(args);`,
    `    callMain(args);`,
    "run(): callMain unconditional"
  );

  // 9) bottom: comment out run();
  src = mustReplace(
    src,
    `\nrun();\n`,
    `\n// run();\n`,
    "comment run() at bottom"
  );

  // 10) add readyPromiseResolve(Module); near end before return moduleRtn
  // (dejamos el mismo espaciado típico del fichero “original”)
  src = mustReplace(
    src,
    `\n\n\n  return moduleRtn;`,
    `\n\n  readyPromiseResolve(Module);\n  return moduleRtn;`,
    "add final readyPromiseResolve before return moduleRtn"
  );

  // 11) Deactivate the final wrapper IIFE (comment it out)
  src = mustReplace(
    src,
    `(() => {\n  // Create a small, never-async wrapper around Module which\n  // checks for callers incorrectly using it with \`new\`.\n  var real_Module = Module;\n  Module = function(arg) {\n    if (new.target) throw new Error("Module() should not be called with \`new Module()\`");\n    return real_Module(arg);\n  }\n})();`,
    `// (() => {\n//   // Create a small, never-async wrapper around Module which\n//   // checks for callers incorrectly using it with \`new\`.\n//   var real_Module = Module;\n//   Module = function(arg) {\n//     if (new.target) throw new Error("Module() should not be called with \`new Module()\`");\n//     return real_Module(arg);\n//   }\n// })();`,
    "comment Module wrapper IIFE"
  );

  // 12) Add extra blank line before missingLibrarySymbols (como en el otro fichero)
  src = src.replace(
    `Module["FS"] = FS;\n\nvar missingLibrarySymbols = [`,
    `Module["FS"] = FS;\n\n\nvar missingLibrarySymbols = [`
  );

  // ------------------------------------------------------------------
  // FIX ROBUSTO: asegurar "return ofile;" dentro de function run(...)
  // (sin depender de que el patrón "checkStackCookie();\n}" sea exacto)
  // ------------------------------------------------------------------
  (function ensureReturnOfileInRun() {
    if (src.includes("return ofile;")) return;

    // Busca el bloque de run() y mete el return tras checkStackCookie();
    const re = /(function run\s*\([^)]*\)\s*\{[\s\S]*?checkStackCookie\(\);\s*\n)([\t ]*)\}/m;
    if (!re.test(src)) {
      throw new Error("run() with checkStackCookie() not found to inject return ofile;");
    }
    src = src.replace(re, `$1$2  return ofile;\n$2}`);
  })();

  return src;
};
