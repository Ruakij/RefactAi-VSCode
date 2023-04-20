"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.get_file_access = exports.get_access_overrides = exports.delete_access_override = exports.set_access_override = exports.set_global_access = exports.get_global_access = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode = require("vscode");
const privacySettings_1 = require("./privacySettings");
async function get_global_access() {
    let global_context = global.global_context;
    if (global_context === undefined) {
        return 0;
    }
    let access = await global_context.globalState.get('global_access');
    if (access === undefined) {
        // FIXME: get from login
        await global_context.globalState.update('global_access', 2);
        return 2;
    }
    if (typeof access !== 'number') {
        access = Number(access);
    }
    return access;
}
exports.get_global_access = get_global_access;
async function set_global_access(new_global_default) {
    if (typeof new_global_default !== 'number') {
        new_global_default = Number(new_global_default);
    }
    let global_context = global.global_context;
    if (global_context !== undefined) {
        await global_context.globalState.update('global_access', new_global_default);
        console.log(['Global Access set to:', new_global_default]);
        privacySettings_1.PrivacySettings.update_webview(privacySettings_1.PrivacySettings._panel);
    }
}
exports.set_global_access = set_global_access;
async function set_access_override(uri, mode) {
    let global_context = global.global_context;
    if (global_context === undefined) {
        return;
    }
    let data = {};
    let storage = await global_context.globalState.get('codifyAccessOverrides');
    if (storage !== undefined) {
        data = storage;
    }
    data[uri] = mode;
    console.log(['Setting access override:', uri, mode]);
    console.log(["type", typeof mode]);
    await global_context.globalState.update('codifyAccessOverrides', data);
    privacySettings_1.PrivacySettings.update_webview(privacySettings_1.PrivacySettings._panel);
}
exports.set_access_override = set_access_override;
async function delete_access_override(uri) {
    let global_context = global.global_context;
    if (global_context === undefined) {
        return;
    }
    let storage = await global_context.globalState.get('codifyAccessOverrides');
    if (storage === undefined) {
        storage = {};
    }
    else {
        delete storage[uri];
        console.log(['Override deleted:', uri]);
    }
    await global_context.globalState.update('codifyAccessOverrides', storage);
    privacySettings_1.PrivacySettings.update_webview(privacySettings_1.PrivacySettings._panel);
}
exports.delete_access_override = delete_access_override;
async function get_access_overrides() {
    let global_context = global.global_context;
    if (global_context === undefined) {
        return {};
    }
    let storage = await global_context.globalState.get('codifyAccessOverrides');
    if (storage === undefined) {
        return {};
    }
    return storage;
}
exports.get_access_overrides = get_access_overrides;
async function get_file_access(uri) {
    let inference_url = vscode.workspace.getConfiguration().get("refactai.infurl");
    let global_context = global.global_context;
    if (global_context === undefined) {
        return 0;
    }
    // inference_url is never undefined (because of package.json)
    if (inference_url !== "") {
        ;
        return 1;
    }
    let storage = global_context.globalState.get('codifyAccessOverrides');
    if (storage === undefined) {
        return await get_global_access();
    }
    let segments = uri.split('/');
    let segments_cnt = segments.length;
    for (let i = 0; i < segments_cnt; i++) {
        let temp = segments.join('/');
        // console.log(['checking', temp]);
        if (storage[temp] !== undefined) {
            console.log(['=> found override', storage[temp]]);
            global.status_bar.choose_color();
            return storage[temp];
        }
        segments.pop();
    }
    let g = await get_global_access();
    // console.log(['=> revert to global default', g]);
    return g;
}
exports.get_file_access = get_file_access;
//# sourceMappingURL=privacy.js.map