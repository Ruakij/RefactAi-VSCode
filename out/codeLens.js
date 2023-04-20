"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.quick_refresh = exports.save_provider = exports.global_provider = exports.LensProvider = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const estate = require("./estate");
class ExperimentalLens extends vscode.CodeLens {
    constructor(range, msg, arg0) {
        if (arg0.length > 0) {
            super(range, {
                title: msg,
                command: 'refactaicmd.codeLensClicked',
                arguments: [arg0]
            });
        }
        else {
            super(range, {
                title: msg,
                command: ''
            });
        }
    }
}
class LensProvider {
    constructor() {
        this.notifyCodeLensesChanged = new vscode.EventEmitter();
        this.onDidChangeCodeLenses = this.notifyCodeLensesChanged.event;
    }
    async provideCodeLenses(document) {
        let state = estate.state_of_document(document);
        if (!state) {
            return [];
        }
        let lenses = [];
        // console.log(["see code_lens_pos", state.diff_lens_pos]);
        if (state.diff_lens_pos < document.lineCount) {
            let range = new vscode.Range(state.diff_lens_pos, 0, state.diff_lens_pos, 0);
            lenses.push(new ExperimentalLens(range, "👍 Approve (Tab)", "APPROVE"));
            lenses.push(new ExperimentalLens(range, "👎 Reject (Esc)", "REJECT"));
            lenses.push(new ExperimentalLens(range, "↻ Rerun \"" + estate.global_intent + "\" (F1)", "RERUN")); // 🔃
            // lenses.push(new ExperimentalLens(range, "🐶 Teach", "TEACH"));
        }
        if (global.enable_longthink_completion && state.completion_lens_pos < document.lineCount) {
            let range = new vscode.Range(state.completion_lens_pos, 0, state.completion_lens_pos, 0);
            lenses.push(new ExperimentalLens(range, "👍 Accept (Tab)", "COMP_APPROVE"));
            lenses.push(new ExperimentalLens(range, "👎 Reject (Esc)", "COMP_REJECT"));
            lenses.push(new ExperimentalLens(range, "🤔 Think Longer (F1)", "COMP_THINK_LONGER"));
            // lenses.push(new ExperimentalLens(range, "↻ Retry (F1)", "COMPLETION_RETRY"));
            state.completion_reset_on_cursor_movement = true;
        }
        else {
            state.completion_reset_on_cursor_movement = false;
        }
        return lenses;
    }
}
exports.LensProvider = LensProvider;
exports.global_provider = null;
function save_provider(provider) {
    exports.global_provider = provider;
}
exports.save_provider = save_provider;
function quick_refresh() {
    if (exports.global_provider) {
        exports.global_provider.notifyCodeLensesChanged.fire();
    }
}
exports.quick_refresh = quick_refresh;
//# sourceMappingURL=codeLens.js.map