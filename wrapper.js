#! /usr/bin/env node

/****************************************
 *
 *  script2svg-html5
 *
 *  Reads an HTML5 file from stdin that contains TeX in script tags
 *  and writes a new HTML5 document to stdout that
 *  contains SVG versions of the math instead.
 *
 */

var typeset = require("./mj-single-svg.js").typeset;
var fs = require('fs');
var jsdom = require('jsdom').jsdom;

//
//  Produce a Usage message, if needed
//
if (process.argv.length !== 4) {
  console.error("Usage: bla input.html  output.html");
  process.exit(1);
}   
// Collect the CLI parameters
var inputFile = process.argv[2];
//console.log(inputFile);
var outputFile = process.argv[3];

//
//  Process an HTML file:
//    Find all math elements,
//    Loop through them, and make typeset calls for each math tag,
//      If the MathML processes correctly,
//        replace the math tag by the svg result.
//      If this is the last one,
//        do the callback with the complete page.
//
function processHTML(html,callback) {
  var document = jsdom(html);
  var math = document.querySelectorAll('[type="math/tex"], [type="math/tex; mode=display"]');
  for (var i = 0, m = math.length; i < m; i++) {
    var data = {math: math[i].text, format:"TeX", svg:true};
    typeset(data,(function (node,last) {return function (result) {
      if (result.svg) {
        var span = document.createElement("span");
        span.innerHTML = result.svg;
        node.parentNode.replaceChild(span.firstChild,node);
      }
      if (last) {callback(document.outerHTML)}
    }})(math[i],i == m-1));
  }
}

//
//  Read the input file, process the HTML, write output file.
//

var html = fs.readFileSync(inputFile, "utf8");

  processHTML(html, function(html) {
    fs.writeFile(outputFile, html, function (err) {
  if (err) throw err;
  console.log('It\'s saved!');
});
  });
