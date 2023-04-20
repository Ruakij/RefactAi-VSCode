"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.status_bar_init = exports.StatusBarMenu = exports.set_inference_message = exports.set_website_message = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const userLogin = require("./userLogin");
const privacy = require("./privacy");
const privacySettings_1 = require("./privacySettings");
let _website_message = "";
let _inference_message = "";
function set_website_message(msg) {
    _website_message = msg;
}
exports.set_website_message = set_website_message;
function set_inference_message(msg) {
    _inference_message = msg;
}
exports.set_inference_message = set_inference_message;
class StatusBarMenu {
    constructor() {
        this.menu = {};
        this.command = 'refactaicmd.statusBarClick';
        this.socketerror = false;
        this.socketerror_msg = '';
        this.spinner = false;
        this.last_url = "";
        this.last_model_name = "";
        this.inference_attempted = false;
        this.access_level = -1;
    }
    // disable_lang: boolean = true;
    // language_name: string = "";
    createStatusBarBlock(context) {
        const item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        item.command = this.command;
        context.subscriptions.push(item);
        item.text = `$(codify-logo) Refact.ai`;
        item.tooltip = `Settings`;
        item.show();
        this.menu = item;
        return this.menu;
    }
    choose_color() {
        if (this.access_level === 0) {
            this.menu.text = `$(refact-icon-privacy) Refact.ai`;
            this.menu.backgroundColor = undefined;
            this.menu.tooltip = `Refact can't access this file because of the privacy rules`;
        }
        else if (this.socketerror) {
            this.menu.text = `$(debug-disconnect) Refact.ai`;
            this.menu.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            if (this.socketerror_msg.indexOf("no model") !== -1) {
                this.menu.tooltip = `Either an outage on the server side, or your settings might be outdated:\n${this.socketerror_msg}`;
            }
            else {
                this.menu.tooltip = `Cannot reach the server:\n` + this.socketerror_msg;
            }
        }
        else if (this.spinner) {
            this.menu.text = `$(sync~spin) Refact.ai`;
            this.menu.backgroundColor = undefined;
        }
        else if (this.inference_attempted) {
            this.menu.text = `$(codify-logo) Refact.ai`;
            this.menu.backgroundColor = undefined;
            let msg = "";
            if (this.last_url) {
                msg += `⚡ ${this.last_url}`;
            }
            if (this.last_model_name) {
                if (msg) {
                    msg += "\n";
                }
                msg += `🗒️ ${this.last_model_name}`;
            }
            if (_website_message || _inference_message) {
                msg += "\n";
                msg += _website_message || _inference_message;
            }
            this.menu.tooltip = msg;
        }
        else if (!userLogin.check_if_login_worked()) { // condition here must be the same as in status_bar_clicked()
            this.menu.text = `$(account) Refact.ai`;
            this.menu.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
            this.menu.tooltip = _website_message || `Click to login`;
        }
        else {
            this.menu.text = `$(codify-logo) Refact.ai`;
            this.menu.backgroundColor = undefined;
            this.menu.tooltip = _website_message || _inference_message || "Welcome to Refact.ai";
        }
    }
    statusbarLoading(spinner) {
        this.spinner = spinner;
        this.choose_color();
    }
    set_socket_error(error, detail) {
        this.socketerror = error;
        if (typeof detail === "string") {
            if (detail.length > 100) {
                detail = detail.substring(0, 100) + "...";
            }
            if (detail !== "{}") {
                this.socketerror_msg = `${detail}`;
            }
            else {
                this.socketerror_msg = "";
            }
        }
        else {
            this.socketerror_msg = "";
        }
        if (this.socketerror) {
            this.last_model_name = "";
        }
        this.choose_color();
    }
    // set_language_enabled(state: boolean, language_name: string)
    // {
    //     this.disable_lang = state;
    //     this.language_name = language_name;
    //     this.choose_color();
    // }
    set_access_level(state) {
        this.access_level = state;
        this.choose_color();
    }
    url_and_model_worked(url, model_name) {
        this.last_url = url;
        this.last_model_name = model_name;
        this.inference_attempted = url !== "";
        this.choose_color();
    }
}
exports.StatusBarMenu = StatusBarMenu;
async function on_change_active_editor(editor) {
    if (!editor) {
        global.status_bar.set_access_level(-1);
        privacySettings_1.PrivacySettings.update_webview(privacySettings_1.PrivacySettings._panel);
        return;
    }
    let document_filename = editor.document.fileName;
    let access_level = await privacy.get_file_access(document_filename);
    global.status_bar.set_access_level(access_level);
    // global.status_bar.choose_color();
}
function status_bar_init() {
    let disposable6 = vscode.window.onDidChangeActiveTextEditor(on_change_active_editor);
    let current_editor = vscode.window.activeTextEditor;
    if (current_editor) {
        on_change_active_editor(current_editor);
    }
    return [disposable6];
}
exports.status_bar_init = status_bar_init;
exports.default = StatusBarMenu;
//# sourceMappingURL=statusBar.js.map