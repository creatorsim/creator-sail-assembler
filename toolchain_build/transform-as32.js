/**
 * jscodeshift transform (text-based): original.js -> deseado.js
 *
 * Run:
 *   npx jscodeshift -t transform.js /mnt/data/original.js
 */

function mustReplace(src, from, to, label) {
  if (!src.includes(from)) {
    throw new Error(`Pattern not found for: ${label}`);
  }
  return src.replace(from, to);
}

module.exports = function transformer(fileInfo) {
  let src = fileInfo.source.replace(/\r\n/g, "\n");

  // 1) Insert "let ofile = null;" at very top (desired has no leading blank line)
  // If original starts with a blank line, we remove exactly one leading newline.
  if (src.startsWith("\n")) src = src.slice(1);

  if (!src.startsWith("let ofile = null;\n")) {
    src = "let ofile = null;\n" + src;
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

  src = mustReplace(src, depFrom, depTo, "dependenciesFulfilled");

  // 3) callMain(): insert comment before exit(ret, true);
  src = mustReplace(
    src,
    "  var ret = entryFunction(argc, argv);\n  exit(ret, true);",
    "  var ret = entryFunction(argc, argv);\n\n    // console.log(FS.readFile(\"./out.o\"));\n  exit(ret, true);",
    "callMain insert comment"
  );

  // 4) run(): insert shouldRunNow/commented block right after function header
  src = mustReplace(
    src,
    "function run(args) {\n args = args || arguments_;",
    "function run(args) {\n  shouldRunNow = true;\n//  if (args === undefined) {\n//   readyPromiseResolve(Module);\n//   return;\n// }\n  \n args = args || arguments_;",
    "run header injection"
  );

  // 5) run(): after preRun guard, change `return;` to `return run(args);`
  src = mustReplace(
    src,
    " preRun();\n if (runDependencies > 0) {\n  return;\n }",
    " preRun();\n if (runDependencies > 0) {\n  return run(args);\n }",
    "runDependencies guard after preRun"
  );

  // 6) doRun(): inject asm_files logic after initRuntime();
  src = mustReplace(
    src,
    "  initRuntime();\n  preMain();",
    "  initRuntime();\n  // at args[2], we have a list of assembly programs to compile\n  var asm_files = args.pop();\n  for (let i = 0; i < asm_files.length; i ++ ){\n    FS.writeFile('./'+asm_files[i].name, asm_files[i].code);\n    args.push('./'+asm_files[i].name);\n  }\n  // for(var i = 2; i < args.length; i++) {\n  //   FS.writeFile('./code' + (i - 2) + '.s', args[i]);\n  //   args[i] = 'code' + (i - 2) + '.s';\n  // }\n  // console.log(FS.readdir(\"./\"));\n  args = [\"-o\",\"out.o\", ...args /*\"-march=rv32imfdv\", \"-mabi=ilp32d\", \"code.s\"*/];\n  preMain();",
    "inject asm_files after initRuntime"
  );

  // 7) doRun(): comment out readyPromiseResolve(Module) right after preMain()
  src = mustReplace(
    src,
    "  preMain();\n  readyPromiseResolve(Module);",
    "  preMain();\n  // readyPromiseResolve(Module);",
    "comment readyPromiseResolve in doRun"
  );

  // 8) run(): after checkStackCookie(); add commented lines + return ofile
  src = mustReplace(
    src,
    " checkStackCookie();\n}",
    " checkStackCookie();\n\n//  readyPromiseResolve(Module);\n//  return Module.ready;\n  return ofile;\n}",
    "return ofile at end of run"
  );

  // 9) exit(): insert reading out.o and logging at start
  src = mustReplace(
    src,
    "function exit(status, implicit) {\n EXITSTATUS = status;",
    "function exit(status, implicit) {\n  ofile = FS.readFile(\"./out.o\");\n  console.log(ofile);\n EXITSTATUS = status;",
    "exit() insert ofile read/log"
  );

  // 10) bottom: comment out run(); and add readyPromiseResolve(Module);
  src = mustReplace(
    src,
    "\nrun();\n\n\n  return Module.ready",
    "\n// run(); \n\n\n  readyPromiseResolve(Module);\n\n\n  return Module.ready",
    "bottom run(); -> commented + readyPromiseResolve"
  );

  return src;
};
