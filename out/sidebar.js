"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PanelWebview = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const estate = require("./estate");
const userLogin = require("./userLogin");
const dataCollectionPage = require("./dataCollectionPage");
const dataCollection = require("./dataCollection");
const extension = require("./extension");
const fetchH2 = require("fetch-h2");
const privacy = require("./privacy");
const chatTab_1 = require("./chatTab");
async function open_chat_tab(question, editor, attach_default, model) {
    await chatTab_1.ChatTab.activate_from_outside(question, editor, attach_default, model);
}
class PanelWebview {
    constructor(_context) {
        this._context = _context;
        this._history = [];
        this.selected_lines_count = 0;
        this.access_level = -1;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        setTimeout(() => {
            webviewView.webview.postMessage({
                command: "editor_inform",
                selected_lines_count: this.selected_lines_count,
                access_level: this.access_level,
            });
        }, 1000);
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._context.extensionUri],
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        this.update_webview();
        this.get_bookmarks();
        vscode.commands.registerCommand('workbench.action.focusSideBar', () => {
            webviewView.webview.postMessage({ command: "focus" });
        });
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                // case "toolboxSelected": {
                //     vscode.window.onDidChangeTextEditorSelection((e) => {
                //         this.check_selection();
                //     });
                // }
                case "focus_back_to_editor": {
                    vscode.commands.executeCommand('workbench.action.focusActiveEditorGroup');
                    break;
                }
                case "submit_like": {
                    this.submit_like(data.function_name, data.like);
                    break;
                }
                case "submit_bookmark": {
                    this.set_bookmark(data.function_name, data.state);
                    break;
                }
                case "open_new_chat": {
                    let question = data.question;
                    let chat_empty = data.chat_empty;
                    if (!question) {
                        question = "";
                    }
                    let editor = vscode.window.activeTextEditor;
                    if (editor) {
                        let selection = editor.selection;
                        let attach_default = !selection.isEmpty || !chat_empty;
                        if (selection.isEmpty) {
                            await open_chat_tab(question, editor, attach_default, data.chat_model);
                        }
                        else {
                            await open_chat_tab(question, editor, attach_default, data.chat_model);
                        }
                    }
                    else {
                        await open_chat_tab("", undefined, false, "");
                    }
                    break;
                }
                case "function_activated": {
                    if (vscode.workspace.getConfiguration().get('refactai.autoHideSidebar')) {
                        vscode.commands.executeCommand('workbench.action.toggleSidebarVisibility');
                    }
                    console.log('*** function_activated ***', data);
                    if (!data.data_function) {
                        console.log(["function_dict is not defined", data.data_function]);
                        return;
                    }
                    let function_dict = JSON.parse(data.data_function);
                    let editor = vscode.window.activeTextEditor;
                    let function_name = "";
                    let model_suggest = function_dict.model;
                    let selected_text = "";
                    if (editor) {
                        let state = estate.state_of_editor(editor, "function_activated");
                        let selection = editor.selection;
                        let selection_empty = selection.isEmpty;
                        // let selected_lines_count = selection.end.line - selection.start.line + 1;
                        // let access_level = await privacy.get_file_access(editor.document.fileName);
                        // should be, min < selected_lines_count < max, but we don't care because UI was disabled so wrong function is not likely to
                        // happen, and we have the access level check closer to the socket in query_diff()
                        if (selection_empty) {
                            function_name = function_dict.function_highlight;
                            if (!function_name) {
                                function_name = function_dict.function_name;
                            }
                            if (selection_empty && function_dict.supports_highlight === false) {
                                console.log(["no selection, but function", function_name, "doesn't support highlight"]);
                                return;
                            }
                        }
                        else {
                            function_name = function_dict.function_selection;
                            if (!function_name) {
                                function_name = function_dict.function_name;
                            }
                            if (function_dict.supports_selection === false) {
                                console.log(["selection present, but", function_name, "doesn't support selection"]);
                                return;
                            }
                        }
                        if (state) {
                            let current_mode = state.get_mode();
                            if (current_mode !== estate.Mode.Normal && current_mode !== estate.Mode.Highlight) {
                                console.log([`don't run "${function_name}" because mode is ${current_mode}`]);
                                return;
                            }
                            state.diff_lens_pos = Number.MAX_SAFE_INTEGER;
                            state.completion_lens_pos = Number.MAX_SAFE_INTEGER;
                            await estate.switch_mode(state, estate.Mode.Normal);
                        }
                        selected_text = editor.document.getText(selection);
                    }
                    if (typeof function_name !== "string") {
                        console.log(["function_name is not a string", function_name]);
                        return;
                    }
                    let intent;
                    if (function_dict.model_fixed_intent) {
                        intent = function_dict.model_fixed_intent;
                    }
                    else {
                        if (typeof data.intent !== "string") {
                            console.log(["data.value is not a string", data.value]);
                            return;
                        }
                        intent = data.intent;
                    }
                    if (function_name.includes("free-chat")) {
                        await open_chat_tab(intent, editor, true, model_suggest);
                    }
                    else if (function_dict.supports_highlight && selected_text === "") {
                        await extension.follow_intent_highlight(intent, function_name, model_suggest, !!function_dict.third_party);
                    }
                    else if (function_dict.supports_selection && selected_text !== "") {
                        await extension.follow_intent_diff(intent, function_name, model_suggest, !!function_dict.third_party);
                    }
                    else if (!function_dict.supports_selection && selected_text === "") {
                        await extension.follow_intent_diff(intent, function_name, model_suggest, !!function_dict.third_party);
                    }
                    else {
                        console.log(["don't know how to run function", function_name]);
                    }
                    break;
                }
                case "login": {
                    vscode.commands.executeCommand('refactaicmd.login');
                    break;
                }
                case "privacy": {
                    vscode.commands.executeCommand("refactaicmd.privacySettings");
                    break;
                }
                case "js2ts_report_bug": {
                    vscode.env.openExternal(vscode.Uri.parse(`https://github.com/smallcloudai/refact-vscode/issues`));
                    break;
                }
                case "js2ts_discord": {
                    vscode.env.openExternal(vscode.Uri.parse(`https://www.smallcloud.ai/discord`));
                    break;
                }
                case "js2ts_logout": {
                    vscode.commands.executeCommand("refactaicmd.logout");
                    break;
                }
                case "js2ts_goto_profile": {
                    vscode.env.openExternal(vscode.Uri.parse(`https://refact.smallcloud.ai/account?utm_source=plugin&utm_medium=vscode&utm_campaign=account`));
                    break;
                }
                case "js2ts_goto_datacollection": {
                    if (global.global_context !== undefined) {
                        dataCollectionPage.DataReviewPage.render(global.global_context);
                        dataCollection.data_collection_prepare_package_for_sidebar();
                    }
                    break;
                }
                case "js2ts_refresh_login": {
                    global.user_logged_in = "";
                    global.user_active_plan = "";
                    this.update_webview();
                    await userLogin.login();
                    break;
                }
                case "openSettings": {
                    vscode.commands.executeCommand("refactaicmd.openSettings");
                    break;
                }
                case "openKeys": {
                    vscode.commands.executeCommand('workbench.action.openGlobalKeybindings', '@ext:smallcloud.codify');
                    break;
                }
                // case "checkSelection": {
                //     this.check_selection();
                //     break;
                // }
                // case "checkSelectionDefault": {
                //     this.check_selection_default(data.intent);
                //     break;
                // }
            }
        }); // onDidReceiveMessage
        webviewView.webview.postMessage({ command: "focus" });
    } // resolveWebView
    async editor_inform_how_many_lines_selected(ev_editor) {
        let selected_lines = 0;
        let access_level = -1;
        if (ev_editor) {
            if (!ev_editor.selection.isEmpty) {
                selected_lines = 1 + ev_editor.selection.end.line - ev_editor.selection.start.line;
            }
            access_level = await privacy.get_file_access(ev_editor.document.fileName);
        }
        let state = estate.state_of_editor(ev_editor, "how_many_lines_selected");
        if (state) {
            let current_mode = state.get_mode();
            if (current_mode !== estate.Mode.Normal && current_mode !== estate.Mode.Highlight) {
                access_level = -1;
            }
        }
        this.selected_lines_count = selected_lines;
        this.access_level = access_level;
        if (this._view) {
            if (this._view.webview) {
                this._view.webview.postMessage({
                    command: "editor_inform",
                    selected_lines_count: this.selected_lines_count,
                    access_level: access_level, // this doesn't decide to proceed or not, this is just for the UI
                });
            }
        }
    }
    update_webview() {
        if (!this._view) {
            return;
        }
        let manual_infurl = vscode.workspace.getConfiguration().get("refactai.infurl");
        let plan_msg = global.user_active_plan;
        if (!plan_msg && global.streamlined_login_countdown > -1) {
            plan_msg = `Waiting for website login... ${global.streamlined_login_countdown}`;
        }
        else if (plan_msg) {
            plan_msg = "Active Plan: <b>" + plan_msg + "</b>";
        }
        this._view.webview.postMessage({
            command: "ts2web",
            ts2web_user: global.user_logged_in,
            ts2web_plan: plan_msg,
            ts2web_metering_balance: global.user_metering_balance,
            ts2web_longthink_functions: global.longthink_functions_today,
            ts2web_longthink_filters: global.longthink_filters,
            ts2web_enable_chat: manual_infurl,
        });
    }
    async set_bookmark(function_name, state) {
        let global_context = global.global_context;
        if (global_context === undefined) {
            return;
        }
        let data = {};
        let bookmarks = await global_context.globalState.get('refactBookmarks');
        if (bookmarks !== undefined) {
            data = bookmarks;
        }
        data[function_name] = state;
        console.log(['Setting bookmark:', function_name, state]);
        await global_context.globalState.update('refactBookmarks', data);
        this.get_bookmarks();
    }
    async get_bookmarks() {
        let global_context = global.global_context;
        if (global_context === undefined) {
            return 0;
        }
        let bookmarks_ = await global_context.globalState.get('refactBookmarks');
        let bookmarks = {};
        if (bookmarks_ !== undefined) {
            bookmarks = bookmarks_;
        }
        return this._view.webview.postMessage({ command: "update_bookmarks_list", value: bookmarks });
    }
    async submit_like(function_name, like) {
        const apiKey = userLogin.secret_api_key();
        if (!apiKey) {
            return;
        }
        const headers = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        };
        let url = `https://www.smallcloud.ai/v1/longthink-like?function_name=${function_name}&like=${like}`;
        let response = await fetchH2.fetch(url, {
            method: "GET",
            headers: headers,
        });
        if (response.status !== 200) {
            console.log([response.status, url]);
            return;
        }
        if (response.status === 200) {
            let json = await response.json();
            if (json.retcode === 'OK') {
                let longthink_functions_today = global.longthink_functions_today; // any or number
                if (longthink_functions_today !== undefined) {
                    for (const key of Object.keys(longthink_functions_today)) {
                        if (key === function_name) {
                            if (json.inserted === 1) {
                                longthink_functions_today[key].likes += 1;
                                longthink_functions_today[key].is_liked = 1;
                            }
                            if (json.deleted === 1) {
                                longthink_functions_today[key].likes -= 1;
                                longthink_functions_today[key].is_liked = 0;
                            }
                            this._view.webview.postMessage({ command: "update_longthink_functions", value: longthink_functions_today });
                        }
                    }
                }
            }
        }
    }
    // public async presetIntent(intent: string) {
    //     let editor = vscode.window.activeTextEditor;
    //     if (!editor) {
    //         return;
    //     }
    //     let selection = editor.selection;
    //     let selectionEmpty = selection.isEmpty;
    //     if (selectionEmpty) {
    //         if (intent) {
    //             highlight.query_highlight(editor, intent);
    //         }
    //     } else {
    //         if (intent) {
    //             estate.saveIntent(intent);
    //             editor.selection = new vscode.Selection(selection.start, selection.start);
    //             interactiveDiff.query_diff(editor, selection, "diff-selection");
    //         }
    //     }
    // }
    // public updateQuery(intent: string) {
    //     if (!this._view) {
    //         return;
    //     }
    //     this._view!.webview.postMessage({ command: "updateQuery", value: intent });
    // }
    // public addHistory(intent: string) {
    //     if (!this._view) {
    //         return;
    //     }
    //     this._history.push(intent);
    //     this._view!.webview.postMessage({
    //         command: "updateHistory",
    //         value: this._history,
    //     });
    // }
    _getHtmlForWebview(webview) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, "assets", "sidebar.js"));
        const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._context.extensionUri, "assets", "sidebar.css"));
        const nonce = this.getNonce();
        return `<!DOCTYPE html>
                <html lang="en">
                <head>
                <meta charset="UTF-8">
                <!--
                    Use a content security policy to only allow loading images from https or from our extension directory,
                    and only allow scripts that have a specific nonce.
                -->
                <!-- <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"> -->
                <meta name="viewport" content="width=device-width, initial-scale=1.0">

                <title>Presets</title>
                <link href="${styleMainUri}" rel="stylesheet">
            </head>
            <body>
                <div id="sidebar" class="sidebar">
                    <div class="toolbox">
                        <div class="toolbox-inline">
                            <input class="toolbox-search" id="toolbox-search" placeholder="press F1; ↓ commands; ↑ history">
                        </div>
                        <div class="toolbox-tags">
                        </div>
                        <div class="toolbox-container">
                            <div class="toolbox-list"></div>
                        </div>
                    </div>
                    <div class="sidebar-controls">
                        <button tabindex="-1" id="datacollection">Review Data...</button>

                        <button tabindex="-1" id="login">Login / Register</button>
                        <div class="sidebar-inline">
                            <button tabindex="-1" id="chat"><span></span>New Chat</button>
                            <div class="sidebar-group">
                                <button tabindex="-1" id="privacy"><span></span>Privacy</button>
                                <button tabindex="-1" id="settings"><span></span></button>
                                <button tabindex="-1" id="keys"><span></span></button>
                            </div>
                        </div>
                        <div class="sidebar-inline">
                            <div class="sidebar-logged"><b><span></span></b></div>
                            <div class="sidebar-coins"><div class="sidebar-coin"></div><span>0</span></div>
                        </div>
                        <div class="sidebar-inline">
                            <div class="sidebar-plan"><span></span><button class="sidebar-plan-button"></button></div>
                            <button tabindex="-1" id="logout" class=""><span></span>Logout</button>
                        </div>
                        <div class="sidebar-inline">
                            <button tabindex="-1" id="profile"><span></span>Your&nbsp;Account</button>
                            <button tabindex="-1" id="report_bugs"><span></span>Report&nbsp;Bug</button>
                            <button tabindex="-1" id="discord" class=""><span></span>Discord</button>
                        </div>
                    </div>
                </div>
                    <script nonce="${nonce}" src="${scriptUri}"></script>
                </body>
                </html>`;
    }
    getNonce() {
        let text = "";
        const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    save_like(function_name) {
    }
}
exports.PanelWebview = PanelWebview;
exports.default = PanelWebview;
//# sourceMappingURL=sidebar.js.map