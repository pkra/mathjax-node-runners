# Scripts for MathJax-node

This repository contains a few customized scripts to work with [MathJax-node](http://github.com/mathjax/mathjax-node).

## Requirements

A working copy of [MathJax-node](http://github.com/mathjax/mathjax-node).

## Content 

### wrapper.js

A basice wrapper around a server-side MathJax solution with the goal of converting HTML fragments with MathJax input to HTML fragments with (cleaned up) MathJax output.

Usage:

  node wrapper.js --FORMAT input.html output.html

where `FORMAT` is `svg`, `svg-simple`, or `mml`.

* `svg`: creating a global SVG object with paths for re-use; efficient but not always ideal for post-processing, e.g., [HTMLbook](https://github.com/oreillymedia/HTMLBook))
* `svg-simple`: no global SVG object, each SVG is self-contained; inefficient but simplifies post-processing.
* `mml`: converts to MathML. For convenience; bascically equivalent to MathJax-node's `page2mml`.

