/****************************************
 *
 *  wrapper.js
 *
 *  Reads an HTML5 file from the filesystem that contains TeX in script tags
 *  and writes a new HTML5 document to the filesystem that
 *  contains MathML or SVG versions of the math instead.
 *
 * Copyright (c) 2013-2014 The MathJax Consortium
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License. *
 */


var typeset = require("../lib/mj-single.js").typeset;
var fs = require("fs");
var jsdom = require("jsdom").jsdom;

//
//  Produce a Usage message, if needed
//
if (process.argv.length !== 5) {
    console.error("Usage:" + process.argv[1] + " --output input.html  output.html");
    process.exit(1);
}
// Collect the CLI parameters
var inputFile = process.argv[3];
var outputFile = process.argv[4];
var outputChoice = process.argv[2].substr(2);
if (!(outputChoice==="mml" || outputChoice==="svg" || outputChoice==="svg-simple")){
        console.log("Please use '--svg' or '--svg-simple' or '--mml'");
        process.exit(1);
    }


// function for moving paths to a global element
function svgCleaning (localElement,globalElement) {
    var thePaths = localElement.querySelectorAll("path");
    for (var i = 0; i < thePaths.length; i++) {
        var currentPath = thePaths[i];
        var currentPathID = currentPath.getAttribute("id");
        if ( globalElement.querySelector("#"+currentPathID) === null){
            globalElement.firstChild.appendChild(currentPath);     
        }
        else {
            currentPath.parentNode.removeChild(currentPath);
        }
    }
}

//
//  Process an HTML file:
//    Find all math elements,
//    Loop through them, and make typeset calls for each math tag,
//      If the TeX processes correctly,
//        replace the math tag by the result.
//      If this is the last one,
//        do the callback with the complete page.
//
function processHTML(html, callback) {
    var document = jsdom(html);
    var math = document.querySelectorAll("[type='math/tex'], [type='math/tex; mode=display']");
//    Create stylesheet 
    var styleSheet = document.createElement('link');
    styleSheet.setAttribute('rel', 'stylesheet');
    styleSheet.setAttribute('type', 'text/css');
    styleSheet.setAttribute('href', 'mathjax-node.css');
    document.getElementsByTagName('head')[0].appendChild(styleSheet);
//    Creating a global SVG object collecting up all paths 
    var globalSVG = document.createElement("svg");
    globalSVG.setAttribute("class","mathjax-svg-global");
    globalSVG.innerHTML = "<defs></defs>";
    var data = {
        width: 100, //change width in ex (to trigger for linebreaking, e.g., for responsive design); 100 is the default
        math: "",
    //    useGlobalCache: true, //this should be the right way to gather a globalSVG but doesn't work for me at this time.
        mml:true,
        svg: true,
        state: {} //see useGlobalCache
    };
    if (outputChoice==="svg-simple"){
        data.useFontCache = false;
        data.useGlobalCache = false;
    }

    for (var i = 0, m = math.length; i < m; i++) {
        data.math = math[i].text;
        if (math[i].getAttribute("type")==="math/tex; mode=display") {
            data.format = "TeX";
        }
        else { data.format = "inline-TeX";}
        typeset(data, (function (node, last) {
            return function (result) {
                var span = document.createElement("span");
                if (outputChoice==="mml"){
                     if (result.mml) {
                         span.innerHTML = result.mml;
                         node.parentNode.replaceChild(span.firstChild, node);
                    }
                }
                else {
                    if (result.svg) {
                        span.innerHTML = result.svg;
                        if (node.getAttribute("type") === "math/tex; mode=display") { // FIX use data.format?
                            span.setAttribute("class", "mathjax-svg-display");
                            span.firstChild.removeAttribute("style"); // TODO removing the style fixed all cases of SVG overlapping next line. Why?
                            node.parentNode.replaceChild(span, node);
                        }
                        else{ 
                            node.parentNode.replaceChild(span.firstChild, node);
                            }
                        if (outputChoice==="svg"){
                            svgCleaning(span,globalSVG);
                        }
                    }
                }
                if (last) {
                    if (outputChoice==="svg"){
                        document.body.appendChild(globalSVG);
                    }
                    callback(document.outerHTML);
                }
            };
        })(math[i], i == m - 1));
    }
}

//
//  Read the input file, process the HTML, write output file.
//

var html = fs.readFileSync(inputFile, "utf8");

processHTML(html, function (html) {
    fs.writeFile(outputFile, html, function (err) {
        if (err) {throw err;}
        console.log("It\'s saved!");
    });
});