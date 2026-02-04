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

  // 0) Normaliza: quita 1 newline inicial si existe (tu original empieza con '\n')
  if (src.startsWith("\n")) src = src.slice(1);

  // 1) Header: añade let elfile + import libs_to_load antes de Module
  if (!src.startsWith('let elfile = null;\n')) {
    src = mustReplace(
      src,
      "var Module = (() => {\n",
      'let elfile = null;\nimport { libs_to_load } from "../CNAssambler.mjs";\nvar Module = (() => {\n',
      "prepend elfile + import"
    );
  }

  // 2) Comment out dependenciesFulfilled block
  const depFrom =
`dependenciesFulfilled = function runCaller() {
 if (!calledRun) run();
 if (!calledRun) dependenciesFulfilled = runCaller;
};`;

  const depTo =
`// dependenciesFulfilled = function runCaller() {
//  if (!calledRun) run();
//  if (!calledRun) dependenciesFulfilled = runCaller;
// };`;

  src = mustReplace(src, depFrom, depTo, "dependenciesFulfilled comment-out");

  // 3) run(): insert shouldRunNow = true; at top
  src = mustReplace(
    src,
    "function run(args) {\n args = args || arguments_;",
    "function run(args) {\n  shouldRunNow = true;\n args = args || arguments_;",
    "run() insert shouldRunNow=true"
  );

  // 4) doRun(): after initRuntime(), write linker.ld + input.o + libs_to_load
  src = mustReplace(
    src,
    "  initRuntime();\n  preMain();\n  readyPromiseResolve(Module);",
    "  initRuntime();\n  FS.writeFile(\"./linker.ld\", args[0]);\n  args.shift();\n  FS.writeFile(\"./input.o\", args[0]);\n  args.shift();\n  for (let i = 0; i < libs_to_load.length; i++){\n    FS.writeFile(\"./\" + libs_to_load[i].name, libs_to_load[i].file);\n  }\n  preMain();\n  readyPromiseResolve(Module);",
    "inject linker.ld/input.o/libs_to_load after initRuntime"
  );

  // 5) exit(): read output.elf + log at function start
  src = mustReplace(
    src,
    "function exit(status, implicit) {\n EXITSTATUS = status;",
    "function exit(status, implicit) {\n  elfile = FS.readFile(\"./output.elf\");\n  console.log(elfile);\n EXITSTATUS = status;",
    "exit() insert elfile read/log"
  );

  // 6) bottom: comment out run(); and add readyPromiseResolve(Module);
  src = mustReplace(
    src,
    "\nrun();\n\n\n  return Module.ready",
    "\n// run();\n  readyPromiseResolve(Module);\n\n  return Module.ready",
    "bottom run() -> commented + readyPromiseResolve"
  );

  // 7) ROBUST: asegurar que run() devuelve elfile tras checkStackCookie()
  // (no dependemos de que el bloque final sea exactamente igual)
  (function ensureReturnElfileInRun() {
    if (src.includes("return elfile;")) return;

    const re =
      /(function run\s*\([^)]*\)\s*\{[\s\S]*?checkStackCookie\(\);\s*\n)([\t ]*)\}/m;

    if (!re.test(src)) {
      throw new Error("run() with checkStackCookie() not found to inject return elfile;");
    }

    // Inserta exactamente como en deseado:
    // //  FS.readFile("./output.elf");
    // return elfile;
    src = src.replace(
      re,
      `$1$2//  FS.readFile("./output.elf");\n$2return elfile;\n$2}`
    );
  })();

  return src;
};
