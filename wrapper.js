/****************************************
 *
 *  script2svg-html5
 *
 *  Reads an HTML5 file from stdin that contains TeX in script tags
 *  and writes a new HTML5 document to stdout that
 *  contains SVG versions of the math instead.
 *
 */


var typeset = require("./lib/mj-single.js").typeset;
var fs = require('fs');
var jsdom = require('jsdom').jsdom;

//
//  Produce a Usage message, if needed
//
if (process.argv.length !== 5) {
    console.error("Usage:" + process.argv[1] + " --output input.html  output.html");
    process.exit(1);
}
// Collect the CLI parameters
var inputFile = process.argv[3];
//console.log(inputFile);
var outputFile = process.argv[4];
var outputChoice = process.argv[2].substr(2);
if (!outputChoice==="mathml" && !outputChoice==="svg"){
        console.log("Please use '--svg' or '--mathml'");
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
//            console.log(currentPath);
        }
    }
//    localElement.removeChild(localElement.querySelector("defs");
}

//
//  Process an HTML file:
//    Find all math elements,
//    Loop through them, and make typeset calls for each math tag,
//      If the MathML processes correctly,
//        replace the math tag by the svg result.
//      If this is the last one,
//        do the callback with the complete page.
//
function processHTML(html, callback) {
    var document = jsdom(html);
    var math = document.querySelectorAll('[type="math/tex"], [type="math/tex; mode=display"]');
//    Creating a global SVG object collecting up all paths TODO: 
    var globalSVG = document.createElement("svg");
    globalSVG.setAttribute("style","visibility: hidden; overflow: hidden; position: absolute; top: 0px; height: 1px; width: auto; padding: 0px; border: 0px; margin: 0px; text-align: left; text-indent: 0px; text-transform: none; line-height: normal; letter-spacing: normal; word-spacing: normal;");
    globalSVG.innerHTML = "<defs></defs>";
    var data = {
    math: "",
//    format: "inline-TeX",
//    useGlobalCache: true,
    mml:true,
    svg: true,
//    state: {}
    };

    for (var i = 0, m = math.length; i < m; i++) {
        data.math = math[i].text;
//        console.log("getAttribute: "+math[i].getAttribute("type"));
        if (math[i].getAttribute("type")==="math/tex; mode=display") {
            data.format = "TeX";
        }
        else { data.format = "inline-TeX";}
//        console.log("data.format: " + data.format);
        typeset(data, (function (node, last) {
            return function (result) {
                if (outputChoice==="svg"){
                    if (result.svg) {
//                        console.log("in the svg: " + data.format); // why is this always returning inline-TeX? Async problem?
                        if (node.getAttribute("type") === 'math/tex; mode=display') { // would like to use data.format but see above
                            var div = document.createElement("div");
                            div.innerHTML = result.svg;
                            var thisSVG = div.firstChild;
                            div.setAttribute("style", "text-align: center;");
                            thisSVG.removeAttribute("style"); // the absolute positioning led to some problems?
                            node.parentNode.replaceChild(div, node);
    //                    var newDefs = document.createElement("def");
    //                    newDefs.innerHTML = (data.state.defs.innerHTML);
    //                    globalSVG.appendChild(newDefs);
                            svgCleaning(div,globalSVG);
                        }
                        else{ 
                            var span = document.createElement("span");
                            span.innerHTML = result.svg;
                            svgCleaning(span,globalSVG);
                            node.parentNode.replaceChild(span.firstChild, node);
                            }

                    }
                }
                else {
                     if (result.mml) {
                         var span = document.createElement("span");
                         span.innerHTML = result.mml;
                         var thisMML = span.firstChild;
                         node.parentNode.replaceChild(span.firstChild, node);
                    }
                }
                if (last) {
//                    console.log(data.state.defs);
//                    globalSVG.appendChild(data.state.defs);
                    document.body.appendChild(globalSVG);
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
        console.log('It\'s saved!');
    });
});