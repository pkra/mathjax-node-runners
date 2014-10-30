#! /usr/bin/env node
/************************************************************************
 *
 *  wrapper-jats.js
 *
 *  A wrapper around MathJax-node for JATS-like files.
 *
 *  Reads an XML file that contains JATS-style *-formula elements 
 *  with tex-math nodes and writes a new XML file that
 *  adds MathML representations.
 *
 * ----------------------------------------------------------------------
 *
 *  Copyright (c) 2014 The MathJax Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

var mjAPI = require("MathJax-node/lib/mj-single");
var typeset = mjAPI.typeset;
var fs = require('fs');
var path = require('path');
var async = require('async');
var libxmljs = require("libxmljs");


var argv = require("yargs")
  .strict()
  .usage("Usage: jats -i input.html -o output.html",{
    i: {
        describe: 'specify input file',
        alias: ('i','input')
    },
    o: {
        describe: 'specify output file',
        alias: ('o','output')
    },
    // TODO  implement more options
//    speech: {
//      boolean: true,
//      describe: "include speech text"
//    },
//    linebreaks: {
//      boolean: true,
//      describe: "perform automatic line-breaking on SVG (see --width)"
//    },
//    inputFormat: {
//      default: "AsciiMath,TeX,MathML", //TODO make his input agnostic
//      describe: "input format(s) to look for",
//    },
   outputFormat: {
     default: "MathML, SVG",
     describe: "output format(s) to generate; MathML, SVG, or PNG" //NOTE add multiple versions
   },
//    font: {
//      default: "TeX",
//      describe: "web font to use (for image output)"
//    },
//    ex: {
//      default: 6,
//      describe: "ex-size in pixels (for image output)"
//    },
//    width: {
//      default: 100,
//      describe: "width of container in ex (e.g., to trigger linebreaking)"
//    }
  })
  .demand(['i','o'])
  .argv;

outputFormats = argv.outputFormat.split(/ *, */);
if (argv.font === "STIX") {argv.font = "STIX-Web";}


var inputFile = fs.readFileSync(path.join(__dirname, argv.i));
var xmlDocument = libxmljs.parseXml(inputFile);

mjAPI.config({
  MathJax: {
    menuSettings: {
      semantics: true,
    }
  }
});
mjAPI.start();

function processMath(texMathNode, callback) { 
    var formulaNode = texMathNode.parent();
    var texString = texMathNode.text();
    var dispStyle = (formulaNode.name()==='disp-formula');
    typeset({
          math: texString,
          format: (dispStyle ? "TeX":"inline-TeX"),
          mml: (outputFormats.indexOf('MathML') > -1),
          svg: (outputFormats.indexOf('SVG') > -1),
          png: (outputFormats.indexOf('PNG') > -1),
        }, function (data) {
          if (!data.errors) {
              if (data.svg){
                  var svgNode = libxmljs.parseXml(data.svg);
                  texMathNode.addPrevSibling(svgNode.root());
              }
              if (data.mml){
                  var mmlString = data.mml.replace(/ xmlns="http:\/\/www.w3.org\/1998\/Math\/MathML"/g,'');  //TODO maybe tell MathJax-node not to add the namespace? Or figure out how libxmljs could do it?
                  var mmlNode = libxmljs.parseXml(mmlString);
                  texMathNode.addPrevSibling(mmlNode.root());                
              }
          }
        callback(data.errors);
    });
}

var texMathNodes = xmlDocument.find('//tex-math');


async.each(texMathNodes, processMath, function (err) {
        if (err) {throw err;}
        var mmlNodes = xmlDocument.find('//math//* | //math');
        for (var idx = 0; idx < mmlNodes.length; idx++) {
              mmlNodes[idx].namespace('mml', '');
        }
//         console.log(xmlDocument.toString());
        fs.writeFile(argv.o, xmlDocument, function (err) {
        if (err) {throw err;}
        console.log("It\'s saved!");
    });
    });
