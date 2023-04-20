"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.status_bar_clicked = exports.deactivate = exports.follow_intent_diff = exports.follow_intent_highlight = exports.ask_and_save_intent = exports.rollback_and_regen = exports.first_run_message = exports.activate = exports.inline_accepted = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const completionProvider = require("./completionProvider");
const highlight = require("./highlight");
const statusBar = require("./statusBar");
const codeLens = require("./codeLens");
const interactiveDiff = require("./interactiveDiff");
const estate = require("./estate");
const fetchAPI = require("./fetchAPI");
const usageStats = require("./usageStats");
const userLogin = require("./userLogin");
const sidebar = require("./sidebar");
const usabilityHints = require("./usabilityHints");
const privacy = require("./privacy");
const privacySettings_1 = require("./privacySettings");
const estate_1 = require("./estate");
async function pressed_escape() {
    console.log(["pressed_escape"]);
    completionProvider.on_esc_pressed();
    let editor = vscode.window.activeTextEditor;
    if (editor) {
        let state = estate.state_of_editor(editor, "pressed_escape");
        if (state) {
            state.diff_lens_pos = Number.MAX_SAFE_INTEGER;
            state.completion_lens_pos = Number.MAX_SAFE_INTEGER;
            codeLens.quick_refresh();
        }
        if (state && (state.get_mode() === estate_1.Mode.Diff || state.get_mode() === estate_1.Mode.DiffWait)) {
            if (state.get_mode() === estate_1.Mode.DiffWait) {
                await fetchAPI.cancel_all_requests_and_wait_until_finished();
            }
            if (state.highlight_json_backup !== undefined) {
                await estate.switch_mode(state, estate_1.Mode.Highlight);
            }
            else {
                await estate.switch_mode(state, estate_1.Mode.Normal);
            }
        }
        else if (state && state.get_mode() === estate_1.Mode.Highlight) {
            await estate.back_to_normal(state);
        }
        if (state && state.get_mode() === estate_1.Mode.Normal) {
            await vscode.commands.executeCommand('setContext', 'refactcx.runEsc', false);
            await vscode.commands.executeCommand('editor.action.inlineSuggest.hide');
            console.log(["ESC OFF"]);
        }
    }
}
async function pressed_tab() {
    let editor = vscode.window.activeTextEditor;
    if (editor) {
        let state = estate.state_of_editor(editor, "pressed_tab");
        if (state && state.get_mode() === estate_1.Mode.Diff) {
            interactiveDiff.like_and_accept(editor);
        }
        else {
            vscode.commands.executeCommand("setContext", "refactcx.runTab", false);
        }
    }
}
async function code_lens_clicked(arg0) {
    let editor = vscode.window.activeTextEditor;
    if (editor) {
        let state = estate.state_of_editor(editor, "code_lens_clicked");
        if (!state) {
            return;
        }
        if (arg0 === "APPROVE") {
            await interactiveDiff.like_and_accept(editor);
        }
        else if (arg0 === "REJECT") {
            await pressed_escape(); // might return to highlight
        }
        else if (arg0 === "RERUN") {
            await rollback_and_regen(editor);
        }
        else if (arg0 === "COMP_APPROVE") {
            state.completion_lens_pos = Number.MAX_SAFE_INTEGER;
            codeLens.quick_refresh();
            await vscode.commands.executeCommand('editor.action.inlineSuggest.commit');
        }
        else if (arg0 === "COMP_REJECT") {
            state.completion_lens_pos = Number.MAX_SAFE_INTEGER;
            codeLens.quick_refresh();
            await vscode.commands.executeCommand('editor.action.inlineSuggest.hide');
        }
        else if (arg0 === "COMP_THINK_LONGER") {
            state.completion_longthink = 1;
            await vscode.commands.executeCommand('editor.action.inlineSuggest.hide');
            await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
        }
        else {
            console.log(["code_lens_clicked: can't do", arg0]);
        }
    }
}
let global_autologin_timer = undefined;
async function login_clicked() {
    let got_it = await userLogin.login();
    if (got_it === "OK") {
        global.streamlined_login_countdown = -1;
        return;
    }
    global.streamlined_login_ticket = Math.random().toString(36).substring(2, 15) + '-' + Math.random().toString(36).substring(2, 15);
    userLogin.inference_login_force_retry();
    await vscode.env.openExternal(vscode.Uri.parse(`https://refact.smallcloud.ai/authentication?token=${global.streamlined_login_ticket}&utm_source=plugin&utm_medium=vscode&utm_campaign=login`));
    let i = 0;
    // Ten attempts to login, 30 seconds apart, will show successful login even if the user does nothing (it's faster if they try completion or similar)
    if (global_autologin_timer) {
        clearInterval(global_autologin_timer);
    }
    global_autologin_timer = setInterval(() => {
        global.streamlined_login_countdown = 30 - (i % 30);
        if (global.user_logged_in || i % 30 === 0) {
            userLogin.login();
        }
        else {
            if (global.side_panel) {
                global.side_panel.update_webview();
            }
        }
        if (global.user_logged_in || i === 300) {
            global.streamlined_login_countdown = -1;
            clearInterval(global_autologin_timer);
            return;
        }
        i++;
    }, 1000);
}
async function f1_pressed() {
    let editor = vscode.window.activeTextEditor;
    if (editor) {
        let state = estate.state_of_editor(editor, "f1_pressed");
        if (state && state.get_mode() === estate_1.Mode.Diff) {
            rollback_and_regen(editor);
            return;
        }
    }
    await vscode.commands.executeCommand("refactai-toolbox.focus");
    await vscode.commands.executeCommand("workbench.action.focusSideBar");
}
async function inline_accepted(this_completion_serial_number) {
    completionProvider.inline_accepted(this_completion_serial_number);
    let fired = await usabilityHints.hint_after_successful_completion();
}
exports.inline_accepted = inline_accepted;
function activate(context) {
    global.global_context = context;
    global.enable_longthink_completion = false;
    global.streamlined_login_countdown = -1;
    global.last_positive_result = 0;
    let disposable1 = vscode.commands.registerCommand('refactaicmd.inlineAccepted', inline_accepted);
    let disposable2 = vscode.commands.registerCommand('refactaicmd.codeLensClicked', code_lens_clicked);
    global.status_bar = new statusBar.StatusBarMenu();
    global.status_bar.createStatusBarBlock(context);
    context.subscriptions.push(vscode.commands.registerCommand(global.status_bar.command, status_bar_clicked));
    codeLens.save_provider(new codeLens.LensProvider());
    if (codeLens.global_provider) {
        context.subscriptions.push(vscode.languages.registerCodeLensProvider({ scheme: "file" }, codeLens.global_provider));
    }
    const comp = new completionProvider.MyInlineCompletionProvider();
    vscode.languages.registerInlineCompletionItemProvider({ pattern: "**" }, comp);
    let disposable4 = vscode.commands.registerCommand('refactaicmd.esc', pressed_escape);
    let disposable5 = vscode.commands.registerCommand('refactaicmd.tab', pressed_tab);
    let disposable3 = vscode.commands.registerCommand('refactaicmd.activateToolbox', f1_pressed);
    let disposable9 = vscode.commands.registerCommand('refactaicmd.addPrivacyOverride0', (uri) => {
        if (!uri || !uri.fsPath) {
            return;
        }
        privacy.set_access_override(uri.fsPath, 0);
        privacySettings_1.PrivacySettings.render(context);
    });
    let disposable10 = vscode.commands.registerCommand('refactaicmd.addPrivacyOverride1', (uri) => {
        if (!uri || !uri.fsPath) {
            return;
        }
        privacy.set_access_override(uri.fsPath, 1);
        privacySettings_1.PrivacySettings.render(context);
    });
    let disposable11 = vscode.commands.registerCommand('refactaicmd.addPrivacyOverride2', (uri) => {
        if (!uri || !uri.fsPath) {
            return;
        }
        privacy.set_access_override(uri.fsPath, 2);
        privacySettings_1.PrivacySettings.render(context);
    });
    let disposable12 = vscode.commands.registerCommand('refactaicmd.privacySettings', () => {
        privacySettings_1.PrivacySettings.render(context);
    });
    let disposable13 = vscode.commands.registerCommand('refactaicmd.completionManual', async () => {
        await vscode.commands.executeCommand('editor.action.inlineSuggest.trigger');
    });
    context.subscriptions.push(disposable3);
    context.subscriptions.push(disposable4);
    context.subscriptions.push(disposable5);
    context.subscriptions.push(disposable1);
    context.subscriptions.push(disposable2);
    context.subscriptions.push(disposable9);
    context.subscriptions.push(disposable10);
    context.subscriptions.push(disposable11);
    context.subscriptions.push(disposable12);
    context.subscriptions.push(disposable13);
    global.side_panel = new sidebar.PanelWebview(context);
    let view = vscode.window.registerWebviewViewProvider('refactai-toolbox', global.side_panel, { webviewOptions: { retainContextWhenHidden: true } });
    context.subscriptions.push(view);
    let settingsCommand = vscode.commands.registerCommand('refactaicmd.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:smallcloud.codify');
        // vscode.commands.executeCommand( 'workbench.action.openGlobalKeybindings', 'Refact.ai' );
    });
    context.subscriptions.push(settingsCommand);
    let login = vscode.commands.registerCommand('refactaicmd.login', () => {
        login_clicked();
    });
    
    // Check VSCode global telemetry-setting
    const telemetryLevel = vscode.workspace.getConfiguration().get('telemetry.telemetryLevel')
    // TODO: Add listener in case it was changed afterwards, also see https://code.visualstudio.com/api/extension-guides/telemetry
    if(telemetryLevel === "all"){   // "all" is the highest level and the first (and only one) to include usage data
        let stats_timer = setInterval(() => {
            usageStats.report_usage_stats();
            clearInterval(stats_timer);
            // We at SMC need to know quickly if there is any widespread problems,
            // please look inside: there is not much being sent.
            stats_timer = setInterval(() => {
                usageStats.report_usage_stats();
            }, 86400000);
        }, 60000); // Start with 1 minute, change to 24 hours
    }
    
    context.subscriptions.push(login);
    let logout = vscode.commands.registerCommand('refactaicmd.logout', async () => {
        context.globalState.update('codifyFirstRun', false);
        await vscode.workspace.getConfiguration().update('refactai.apiKey', undefined, vscode.ConfigurationTarget.Global);
        await vscode.workspace.getConfiguration().update('codify.apiKey', undefined, vscode.ConfigurationTarget.Global);
        global.user_logged_in = "";
        global.user_active_plan = "";
        global.user_metering_balance = 0;
        global.status_bar.choose_color();
        if (global.side_panel) {
            global.side_panel.update_webview();
        }
        vscode.commands.executeCommand("workbench.action.webview.reloadWebviewAction");
    });
    context.subscriptions.push(logout);
    context.subscriptions.push(...statusBar.status_bar_init());
    context.subscriptions.push(...estate.estate_init());
    setTimeout(() => {
        userLogin.login();
    }, 100);
    first_run_message(context);
}
exports.activate = activate;
function first_run_message(context) {
    const firstRun = context.globalState.get('codifyFirstRun');
    if (firstRun) {
        return;
    }
    ;
    context.globalState.update('codifyFirstRun', true);
    userLogin.welcome_message();
}
exports.first_run_message = first_run_message;
async function rollback_and_regen(editor) {
    let state = estate.state_of_editor(editor, "rollback_and_regen");
    if (state) {
        await estate.switch_mode(state, estate_1.Mode.Normal); // dislike_and_rollback inside
        await interactiveDiff.query_the_same_thing_again(editor);
    }
}
exports.rollback_and_regen = rollback_and_regen;
async function ask_and_save_intent() {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        return false;
    }
    let selection = editor.selection;
    let selection_empty = selection.isEmpty;
    let intent = estate.global_intent;
    intent = await vscode.window.showInputBox({
        title: (selection_empty ?
            "What would you like to do? (this action highlights code first)" :
            "What would you like to do with the selected code?"),
        value: estate.global_intent,
        valueSelection: [0, 80],
        placeHolder: 'Convert to list comprehension',
    });
    if (intent) {
        estate.save_intent(intent);
        return true;
    }
    return false;
}
exports.ask_and_save_intent = ask_and_save_intent;
async function follow_intent_highlight(intent, function_name, model_name, third_party) {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    if (!intent) {
        return;
    }
    await highlight.query_highlight(editor, intent, function_name, model_name, third_party);
}
exports.follow_intent_highlight = follow_intent_highlight;
async function follow_intent_diff(intent, function_name, model_name, third_party) {
    let editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }
    if (!intent) {
        return;
    }
    let selection = editor.selection;
    // empty selection will become current line selection
    editor.selection = new vscode.Selection(selection.start, selection.start); // this clears the selection, moves cursor up
    if (selection.end.line > selection.start.line && selection.end.character === 0) {
        let end_pos_in_chars = editor.document.lineAt(selection.end.line - 1).range.end.character;
        selection = new vscode.Selection(selection.start, new vscode.Position(selection.end.line - 1, end_pos_in_chars));
    }
    estate.save_intent(intent);
    await interactiveDiff.query_diff(editor, selection, function_name || "diff-selection", model_name, third_party);
}
exports.follow_intent_diff = follow_intent_diff;
function deactivate(context) {
    usageStats.report_usage_stats();
    global.global_context = undefined;
}
exports.deactivate = deactivate;
async function status_bar_clicked() {
    let editor = vscode.window.activeTextEditor;
    if (!userLogin.check_if_login_worked()) {
        userLogin.login_message();
        return;
    }
    let selection;
    if (!editor) {
        selection = await vscode.window.showInformationMessage("Welcome to Refact.ai 👋", "Open Panel (F1)");
    }
    else {
        let document_filename = editor.document.fileName;
        let access_level = await privacy.get_file_access(document_filename);
        let chunks = document_filename.split("/");
        let pause_completion = vscode.workspace.getConfiguration().get('refactai.pauseCompletion');
        let buttons = [];
        if (access_level > 0) {
            buttons.push(pause_completion ? "Resume Completion" : "Pause Completion");
        }
        buttons.push("Privacy Rules");
        selection = await vscode.window.showInformationMessage(chunks[chunks.length - 1] + ": Access level " + access_level, ...buttons);
    }
    if (selection === "Pause Completion") {
        vscode.workspace.getConfiguration().update('refactai.pauseCompletion', true, true);
    }
    else if (selection === "Resume Completion") {
        vscode.workspace.getConfiguration().update('refactai.pauseCompletion', false, true);
    }
    else if (selection === "Privacy Rules") {
        vscode.commands.executeCommand("refactaicmd.privacySettings");
    }
    else if (selection === "Open Panel (F1)") {
        vscode.commands.executeCommand("refactaicmd.activateToolbox");
    }
}
exports.status_bar_clicked = status_bar_clicked;
//# sourceMappingURL=extension.js.map