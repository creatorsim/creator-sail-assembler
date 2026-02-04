/**
 * jscodeshift transform to convert original.js -> deseado.js
 *
 * Usage:
 *   jscodeshift -t transform.js original.js
 */
module.exports = function transformer(file) {
  let src = file.source;

  // 1) Add exported globals at the very top (exactly like deseado.js)
  if (!src.includes('export var dumptextinstructions32')) {
    const exportsBlock = "\n\nexport var dumptextinstructions32 = [];\nexport var dumpdatainstructions32 = [];\nexport var dumplabels32           = [];\nexport var sectionasm32 = 0;\nexport var inside_label32 = 0;\nexport var islib32 = 0;\nexport var libtags32 = [];\n// export var entry_elf = 0;\n";
    // Replace everything before the first "var Module = (() => {"
    src = src.replace(/^[\s\S]*?\nvar Module = \(\(\) => \{/, exportsBlock + 'var Module = (() => {');
  }

  // 2) Replace out/err block with custom Module['print'] implementation + out/err.
  const printBlock = "\n\n  Module['print'] = function (message) {\n    if (islib32) {\n\n\n      // Regex to get name function\n      if (sectionasm32 === 1){\n        const name_function = message.match(/^([0-9a-f]{8})\\s+<(.+?)>:$/);\n        if (name_function && !libtags32.includes(name_function[2])) \n          libtags32.push(name_function[2]);\n      }\n\n      // Check which section\n      if (message.search(\".text\") != -1)\n        sectionasm32 = 1;\n      if (message.search(\".data\") != -1)\n        sectionasm32 = 2;\n      if (message.search(\".riscv.attributes\") != -1)\n        sectionasm32 = 0;\n\n      \n\n      console.log(message);\n      \n    } else {\n\n      // console.log(typeof message);\n\n      // console.log(\"En que seccion estoy: \", sectionasm32);\n      var auxinsn = [];\n      const auxiliar = message.trim();\n      const datamatch = auxiliar.match(/^([0-9a-fA-F]+):\\s+((?:[0-9a-fA-F]{2,8}(?:\\s+[0-9a-fA-F]{2,8})*))(?:.*?0x([0-9a-fA-F]+))?/); //  /^([0-9a-fA-F]+):.*?0x([0-9a-fA-F]+)/\n      const insnmatch = auxiliar.match(/^(\\w+):\\s+((?:fnmadd\\.s|\\w+|\\.\\w+))\\s+([^\\#]*)(?:#(.*))?$/); // /^(\\w+):\\s+(\\w+)\\s+([^\\#]*)(?:#(.*))?$/\n      const labelmatch = auxiliar.match(/^([0-9a-f]{8})\\s+<(.+?)>:$/);\n      if (insnmatch !== null && sectionasm32 === 1) {\n        const address = insnmatch[1].trim();                       // Parte 1: direcci\u00f3n\n        const hexInstruction = insnmatch[2].trim();                // Parte 2: instrucci\u00f3n hexadecimal\n        const asmInstruction = (insnmatch[3].trim()).replace(/\\\\t/g, ' ');                // Parte 3: instrucci\u00f3n ensamblador (sin el comentario)\n        // const comment = match[4] ? insnmatchmatch[4].trim() : null;  // Parte 4: comentario (opcional)\n        let axx = dumptextinstructions32.findIndex(sublist => sublist.includes(address));\n        if (axx != -1 && sectionasm32 === 1) {\n          dumptextinstructions32[axx][1] = hexInstruction;\n          dumptextinstructions32[axx][2] = asmInstruction.replace(/\\\\t/g, ' ');\n        }\n        else if (sectionasm32 === 1){\n          auxinsn.push(address);\n          auxinsn.push(hexInstruction);\n          auxinsn.push(asmInstruction.replace(/\\\\t/g, ' '));\n          auxinsn.push(0);\n          auxinsn.push(\"\");\n          dumptextinstructions32.push(auxinsn);\n        }\n      }\n      else if (datamatch !== null && sectionasm32 === 2){\n        let axx = dumpdatainstructions32.findIndex(sublist => sublist.includes(datamatch[1])); \n        if (axx !== -1 && sectionasm32 === 2) {\n            dumpdatainstructions32[axx][1] = datamatch[2];\n            dumpdatainstructions32[axx][2] = \"\"; // asmInstruction.replace(/\\\\t/g, ' ');\n        }\n        else if (sectionasm32 === 2) {\n          auxinsn.push(datamatch[1]);\n          auxinsn.push(datamatch[2]);\n          auxinsn.push(\"\"/*asmInstruction.replace(/\\\\t/g, ' ')*/);\n          auxinsn.push(0);\n          auxinsn.push(\"\");\n          if(auxinsn[3] === 0){\n            // console.log(\"Exaa que se va a insertar en un dumpdata anterior: \", auxinsn);\n            // console.log(\"Que es esto: \", /[^0-9a-fA-F]/.test(auxinsn[1]));\n            if(/[^0-9a-fA-F]/.test(auxinsn[1])/*   auxinsn[1].includes(\"madd.s\")*/){\n              //buscamos la palabra completa almacenada por el list_data_instructions\n              var auxda = list_data_instructions.findIndex(data => data.label === dumpdatainstructions32[dumpdatainstructions32.length -1][4]);\n              var list_data_elem;\n              var aux_index_value = list_data_instructions[auxda].value.length;\n              if (typeof list_data_instructions[auxda].value === \"object\"){\n                if (list_data_instructions[auxda].value[aux_index_value - 1].includes(\"-\")){\n                  // caso de ser el valor negativo\n                  let buff, buff_view;\n                  switch (list_data_instructions[auxda].type){\n                  case \"half\":\n                    list_data_elem = (parseInt(list_data_instructions[auxda].value[aux_index_value - 1]) & 0xFFFF).toString(16).padStart(4, \"0\");\n                    break;\n                  case \"word\":\n                    list_data_elem = (parseInt(list_data_instructions[auxda].value[aux_index_value - 1]) >>> 0).toString(16).padStart(8, \"0\");\n                    break;\n                  case \"byte\":\n                    list_data_elem = (parseInt(list_data_instructions[auxda].value[aux_index_value - 1]) & 0xFF).toString(16).padStart(2, \"0\");\n                    break;\n                  case \"float\":\n                    buff = new ArrayBuffer(4);\n                    buff_view = new DataView(buff);\n                    buff_view.setFloat32(0, parseFloat(list_data_instructions[auxda].value[aux_index_value - 1]), true);\n                    list_data_elem = buff_view.getUint32(0, true).toString(16).padStart(8, '0');\n\n                    // list_data_elem = (parseFloat(list_data_instructions[auxda].value[aux_index_value - 1])).toString(16);\n                    break;\n                  case \"double\":\n                    buff = new ArrayBuffer(8);\n                    buff_view = new DataView(buff);\n                    buff_view.setFloat64(0, parseFloat(list_data_instructions[auxda].value[aux_index_value - 1]), true);\n                    let lo = buff_view.getUint32(0, true).toString(16).padStart(8, '0');\n                    let hi = buff_view.getUint32(4, true).toString(16).padStart(8, '0');\n\n                    list_data_elem = lo + hi;\n                    break;\n                }\n                  dumpdatainstructions32[dumpdatainstructions32.length - 1][1] = list_data_elem + dumpdatainstructions32[dumpdatainstructions32.length -1][1];\n                }else { // Caso de ser el valor positivo o sin signo\n                  dumpdatainstructions32[dumpdatainstructions32.length -1][1] = list_data_instructions[auxda].value[aux_index_value - 1].toString(16) + dumpdatainstructions32[dumpdatainstructions32.length -1][1];\n                }\n              }\n            }\n            else dumpdatainstructions32[dumpdatainstructions32.length -1][1] = auxinsn[1] + dumpdatainstructions32[dumpdatainstructions32.length -1][1];\n            inside_label32 += 1;\n          }else \n            dumpdatainstructions32.push(auxinsn);\n        }\n      }\n      else if(labelmatch && sectionasm32 != 0){\n        // console.log(\"Identificado:\", labelmatch);\n        auxinsn.push(labelmatch[1].trim());\n        auxinsn.push(\"\");\n        auxinsn.push(\"\");\n        auxinsn.push(1);\n        auxinsn.push(labelmatch[2].trim());\n        console.log(\"labelmatch: \", labelmatch);\n        if (!document.app.$data.c_kernel && labelmatch[2].trim().includes(\"kernel\"))\n          document.app.$data.entry_elf = labelmatch[1].trim();\n        else if(labelmatch[2].trim() === \"_main\" && document.app.$data.c_kernel){\n          document.app.$data.entry_elf = labelmatch[1].trim();\n        }\n\n        if (document.app.$data.entry_elf !== undefined && !document.app.$data.entry_elf.startsWith(\"0x\"))\n          document.app.$data.entry_elf = \"0x\" + document.app.$data.entry_elf;\n        \n        if (sectionasm32 === 1){\n          dumptextinstructions32.push(auxinsn);\n        }else if (sectionasm32 === 2){\n          dumpdatainstructions32.push(auxinsn);\n          inside_label32 = 0;\n        }\n\n      }\n\n      // else {\n      //   // console.log(\"objdump: 1\", message);\n      // }\n\n      // identificacion de que seccion de codigo entramos.\n      if (message.search(\".text\") != -1)\n        sectionasm32 = 1;\n      if (message.search(\".data\") != -1)\n        sectionasm32 = 2;\n      if (message.search(\".riscv.attributes\") != -1)\n        sectionasm32 = 0;\n\n      console.log(message);\n      // console.log(dumpdatainstructions32); \n    }\n  }\n\n  var out = Module[\"print\"] || console.log.bind(console);\n\n  var err = Module[\"printErr\"] || console.warn.bind(console);\n";

  const outErrRegex = /\nvar out = Module\["print"\] \|\| console\.log\.bind\(console\);\n\nvar err = Module\["printErr"\] \|\| console\.warn\.bind\(console\);\n/;
  if (outErrRegex.test(src) && !src.includes("Module['print'] = function (message)")) {
    src = src.replace(outErrRegex, printBlock);
  }

  // 3) Comment out dependenciesFulfilled runCaller block
  const depBlock =
`dependenciesFulfilled = function runCaller() {\n if (!calledRun) run();\n if (!calledRun) dependenciesFulfilled = runCaller;\n};`;
  const depBlockCommented =
`// dependenciesFulfilled = function runCaller() {\n//  if (!calledRun) run();\n//  if (!calledRun) dependenciesFulfilled = runCaller;\n// };`;
  if (src.includes(depBlock) && !src.includes(depBlockCommented)) {
    src = src.replace(depBlock, depBlockCommented);
  }

  // 4) In run(args), add shouldRunNow = true; right after function start (if missing)
  src = src.replace(/function run\(args\) {\n(?!\s*shouldRunNow = true;)/, 'function run(args) {\n  shouldRunNow = true;\n');

  // 5) In doRun(), insert FS.writeFile logic + args.shift() after initRuntime()
  const initToPreMainRegex = /initRuntime\(\);\n\s*preMain\(\);\n\s*readyPromiseResolve\(Module\);\n/;
  if (initToPreMainRegex.test(src) && !src.includes('if (args[2].includes(".o")) { // Disassemble library')) {
    src = src.replace(initToPreMainRegex,
`initRuntime();\n  if (args[2].includes(".o")) { // Disassemble library \n    FS.writeFile("./" + args[2], args[0]);\n    islib32 = 1;\n  }else {\n    FS.writeFile("./input.elf", args[0]);\n  }\n  args.shift();\n  preMain();\n  // readyPromiseResolve(Module);\n`);
  }

  // 6) Add islib32 = 0; before procExit(status); (remove an extra blank line if present)
  if (!src.includes('\n islib32 = 0;\n  procExit(status);\n')) {
    src = src.replace(/\n\s*\n(\s*)procExit\(status\);\n/, '\n$1islib32 = 0;\n$1procExit(status);\n');
  }
  if (!src.includes('\n islib32 = 0;\n  procExit(status);\n')) {
    src = src.replace(/(\n\s*)procExit\(status\);\n/, '$1islib32 = 0;\n$1procExit(status);\n');
  }

  // 6b) Remove blank line between islib32 reset and procExit
  src = src.replace(/islib32 = 0;\n\s*\n(\s*)procExit\(status\);/, 'islib32 = 0;\n$1procExit(status);');

  // 7) At bottom: comment run(); and call readyPromiseResolve(Module);
  src = src.replace(/\nrun\(\);\n\n\n  return Module\.ready\n/, '\n// run();\n  readyPromiseResolve(Module);\n\n  return Module.ready\n');

  return src;
};