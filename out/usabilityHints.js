"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.show_message_from_server = exports.hint_after_successful_completion = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const debug_this_file = false;
async function _countdown(key, start) {
    let context_ = global.global_context;
    if (context_ === undefined) {
        return false;
    }
    let context = context_;
    let countdown_ = context.globalState.get(key);
    let countdown;
    if (countdown_ === undefined) {
        countdown = start;
    }
    else {
        countdown = parseInt(countdown_);
    }
    if (countdown > 0 || debug_this_file) {
        countdown -= 1;
        if (countdown < 0 && debug_this_file) {
            countdown = start;
        }
        console.log(["countdown", countdown]);
        await context.globalState.update(key, countdown);
        if (countdown === 0) {
            return true;
        }
    }
    return false;
}
async function hint_after_successful_completion() {
    let fire = await _countdown("codify.countdownHint1", 5);
    if (fire) {
        await show_hint1();
    }
    return fire;
}
exports.hint_after_successful_completion = hint_after_successful_completion;
async function show_hint1() {
    const header = "Select & Refactor: select a few lines of code, press F1 and tell the model how to change it. " +
        "Good examples:  " +
        "convert to list comprehension,  " +
        "translate to python,  " +
        "add docstring,  " +
        "use numpy.";
    const options = {
        modal: false,
        detail: "Hello world",
    };
    let selection = await vscode.window.showInformationMessage(header, options, "OK");
    // , "No more hints!"
    let context_ = global.global_context;
    if (context_ === undefined) {
        return;
    }
    let context = context_;
    if (selection === "OK") {
        console.log("OK");
        // } else if (selection === "No more hints!") {
    }
}
async function show_message_from_server(kind_of_message, msg) {
    // Show a message from the server, but only once.
    let context_ = global.global_context;
    if (context_ === undefined) {
        return false;
    }
    let context = context_;
    let already_seen = context.globalState.get(`codify.servermsg${kind_of_message}`);
    if (already_seen === undefined) {
        already_seen = "";
    }
    if (already_seen === msg) {
        return false;
    }
    if (msg === "") {
        return false;
    }
    await context.globalState.update(`codify.servermsg${kind_of_message}`, msg);
    let selection = await vscode.window.showInformationMessage(msg, "OK");
}
exports.show_message_from_server = show_message_from_server;
//# sourceMappingURL=usabilityHints.js.map