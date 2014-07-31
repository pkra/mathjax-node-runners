/****************************************
 *
 *  wrapper.js
 *
 *  Reads an HTML5 file from the filesystem that contains TeX in script tags
 *  and writes a new HTML5 document to the filesystem that
 *  contains MathML or SVG versions of the math instead.
 *
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
if (!outputChoice==="mml" && !outputChoice==="svg" && !outputChoice==="svg-simple"){
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
//    Creating a global SVG object collecting up all paths 
    var globalSVG = document.createElement("svg");
    globalSVG.setAttribute("style","visibility: hidden; overflow: hidden; position: absolute; top: 0px; height: 1px; width: auto; padding: 0px; border: 0px; margin: 0px; text-align: left; text-indent: 0px; text-transform: none; line-height: normal; letter-spacing: normal; word-spacing: normal;");
    globalSVG.innerHTML = "<defs></defs>";
    var data = {
        width: 100, //change width in ex 100 is the default
        math: "",
    //    useGlobalCache: true, //this should be the right way to gather a globalSVG but doesn't work for me
        mml:true,
        svg: true,
        state: {} //see useGlobalCache
    };
    if (outputChoice==="svg-simple"){
        data.useFontCache = false;
//        data.useGlobalCache = false;
    }

    for (var i = 0, m = math.length; i < m; i++) {
        data.math = math[i].text;
        if (math[i].getAttribute("type")==="math/tex; mode=display") {
            data.format = "TeX";
        }
        else { data.format = "inline-TeX";}
        typeset(data, (function (node, last) {
            return function (result) {
                if (outputChoice==="svg"){
                    if (result.svg) {
                        if (node.getAttribute("type") === "math/tex; mode=display") { // FIX: can't use data.format b/c it's asynchronous
                            var span = document.createElement("span");
                            span.innerHTML = result.svg;
                            var thisSVG = span.firstChild;
                            span.setAttribute("style", "text-align: center; margin: 1em 0em; position: relative; display: block!important; text-indent: 0; max-width: none; max-height: none; min-width: 0; min-height: 0; width: 100%;overflow:auto"); //move to CSS!
                            thisSVG.removeAttribute("style"); // FIX: the absolute positioning led to some problems?
                            node.parentNode.replaceChild(span, node);
                        }
                        else{ 
                            var span = document.createElement("span");
                            span.innerHTML = result.svg;
                            node.parentNode.replaceChild(span.firstChild, node);
                            }
                        svgCleaning(span,globalSVG);
                    }
                }
                else if (outputChoice==="mml"){
                     if (result.mml) {
                         var span = document.createElement("span");
                         span.innerHTML = result.mml;
                         node.parentNode.replaceChild(span.firstChild, node);
                    }
                }
                else if (outputChoice==="svg-simple"){
//                    console.log("yay simple");
                     if (result.svg) {
                        if (node.getAttribute("type") === "math/tex; mode=display") { // FIX: use data.format
                            var span = document.createElement("span");
                            span.innerHTML = result.svg;
                            var thisSVG = span.firstChild;
                            span.setAttribute("style", "text-align: center; margin: 1em 0em; position: relative; display: block!important; text-indent: 0; max-width: none; max-height: none; min-width: 0; min-height: 0; width: 100%;overflow:auto");
                            thisSVG.removeAttribute("style"); // FIX: the absolute positioning led to some problems?
                            node.parentNode.replaceChild(span, node);
        //                            svgCleaning(span,globalSVG);
                        }
                        else{ 
                            var span = document.createElement("span");
                            span.innerHTML = result.svg;
        //                            svgCleaning(span,globalSVG);
                            node.parentNode.replaceChild(span.firstChild, node);
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
        if (err) throw err;
        console.log("It\'s saved!");
    });
});