/**
 * jscodeshift transform (text-based): /mnt/data/original.js -> /mnt/data/deseado.js
 *
 * Run:
 *   npx jscodeshift -t transform.js /mnt/data/original.js > /mnt/data/salida.js
 *   diff -u /mnt/data/salida.js /mnt/data/deseado.js
 */

function mustReplace(src, from, to, label) {
  if (!src.includes(from)) {
    throw new Error(`Pattern not found for: ${label}`);
  }
  return src.replace(from, to);
}

module.exports = function transformer(fileInfo) {
  let src = fileInfo.source.replace(/\r\n/g, "\n");

  // 1) Prepend header lines (elfile + import) before Module
  if (!src.startsWith("let elfile = null;\n")) {
    src = mustReplace(
      src,
      "var Module = (() => {\n",
      'let elfile = null;\nimport { libs_to_load } from "../CNAssambler.mjs";\nvar Module = (() => {\n',
      "prepend elfile + import"
    );
  }

  // 2) wasm rename: ld-new.wasm -> ld-new64.wasm
  src = src.replaceAll("ld-new.wasm", "ld-new64.wasm");

  // 3) exitJS: add reading output.elf and logging
  src = mustReplace(
    src,
    `/** @suppress {duplicate } */ /** @param {boolean|number=} implicit */ var exitJS = (status, implicit) => {\n  EXITSTATUS = status;`,
    `/** @suppress {duplicate } */ /** @param {boolean|number=} implicit */ var exitJS = (status, implicit) => {\n  elfile = FS.readFile("./output.elf");\n  console.log(elfile);\n  EXITSTATUS = status;`,
    "exitJS add elfile read/log"
  );

  // 4) run(): comment dependenciesFulfilled in both guards
  src = mustReplace(
    src,
    `  if (runDependencies > 0) {\n    dependenciesFulfilled = run;\n    return;\n  }`,
    `  if (runDependencies > 0) {\n    // dependenciesFulfilled = run;\n    return;\n  }`,
    "run() first guard comment dependenciesFulfilled"
  );

  src = mustReplace(
    src,
    `  // a preRun added a dependency, run will be called later\n  if (runDependencies > 0) {\n    dependenciesFulfilled = run;\n    return;\n  }`,
    `  // a preRun added a dependency, run will be called later\n  if (runDependencies > 0) {\n    // dependenciesFulfilled = run;\n    return;\n  }`,
    "run() second guard comment dependenciesFulfilled"
  );

  // 5) doRun(): add console.log(args); at start of doRun
  src = mustReplace(
    src,
    `  function doRun() {\n    // run may have just been called through dependencies being fulfilled just in this very frame,`,
    `  function doRun() {\n    console.log(args);\n    // run may have just been called through dependencies being fulfilled just in this very frame,`,
    "doRun() add console.log(args)"
  );

  // 6) doRun(): inject linker.ld + input.o + libs_to_load after initRuntime()
  src = mustReplace(
    src,
    `    initRuntime();\n    preMain();`,
    `    initRuntime();\n    FS.writeFile("./linker.ld", args[0]);\n    args.shift();\n    FS.writeFile("./input.o", args[0]);\n    args.shift();\n    for (let i = 0; i < libs_to_load.length; i++){\n      FS.writeFile("./" + libs_to_load[i].name, libs_to_load[i].file);\n    }\n    preMain();`,
    "inject linker.ld/input.o/libs_to_load"
  );

  // 7) doRun(): comment readyPromiseResolve(Module);
  src = mustReplace(
    src,
    `    readyPromiseResolve(Module);`,
    `    // readyPromiseResolve(Module);`,
    "comment readyPromiseResolve in doRun"
  );

  // 8) doRun(): make callMain unconditional (remove noInitialRun guard)
  src = mustReplace(
    src,
    `    if (!noInitialRun) callMain(args);`,
    `    callMain(args);`,
    "callMain unconditional"
  );

  // 9) bottom: comment out run();
  src = mustReplace(src, `\nrun();\n`, `\n// run();\n`, "comment run() at bottom");

  // 10) near end: insert readyPromiseResolve(Module); before returning moduleRtn
  src = mustReplace(
    src,
    `\n\n\n  return moduleRtn;`,
    `\n\n  readyPromiseResolve(Module);\n  return moduleRtn;`,
    "insert readyPromiseResolve before return moduleRtn"
  );

  // 11) ROBUST: ensure `return elfile;` exists at end of run() after checkStackCookie()
  (function ensureReturnElfileInRun() {
    if (src.includes("return elfile;")) return;

    const re = /(function run\s*\([^)]*\)\s*\{[\s\S]*?checkStackCookie\(\);\s*\n)([\t ]*)\}/m;
    if (!re.test(src)) {
      throw new Error("run() with checkStackCookie() not found to inject return elfile;");
    }
    src = src.replace(re, `$1$2  return elfile;\n$2}`);
  })();

  return src;
};
