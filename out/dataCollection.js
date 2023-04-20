"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.data_collection_hurray_send_to_mothership = exports.data_collection_prepare_package_for_sidebar = exports.data_collection_save_record = exports.data_feedback_candidate_reset = void 0;
const userLogin = require("./userLogin");
const estate = require("./estate");
const fetchH2 = require("fetch-h2");
function data_feedback_candidate_reset(state) {
    console.log(["DATA FEEDBACK RESET"]);
    state.data_feedback_candidate = new estate.ApiFields();
    return state.data_feedback_candidate;
}
exports.data_feedback_candidate_reset = data_feedback_candidate_reset;
async function data_collection_save_record(d) {
    if (d.sources[d.cursor_file] === undefined || d.results[d.cursor_file] === undefined || d.sources[d.cursor_file] === d.results[d.cursor_file]) {
        return;
    }
    d.ts_reacted = Date.now();
    // console.log([d.positive ? "👍" : "👎", "collection", result.status]);
    const payload = JSON.stringify({
        "positive": d.positive,
        "sources": d.sources,
        "results": d.results,
        "intent": d.intent,
        "function": d.function,
        "cursor_file": d.cursor_file,
        "cursor0": d.cursor_pos0,
        "cursor1": d.cursor_pos1,
        "ponder_time_ms": Math.round(d.ts_reacted - d.ts_presented),
    });
    const same_situation_key = `${d.intent} ${d.cursor_file}:${d.cursor_pos0}:${d.cursor_pos1} --` + d.sources[d.cursor_file];
    if (!global.global_context) {
        return;
    }
    let global_context = global.global_context;
    let rec_count_ = global_context.globalState.get("data_collection_rec_count");
    let rec_count = 0;
    if (rec_count_ !== undefined) {
        rec_count = rec_count_;
    }
    if (rec_count > 500) { // stop saving, user doesn't wish to interact with data collection at all :(
        return;
    }
    let zero_padded = rec_count.toString().padStart(4, "0");
    await global_context.globalState.update(`data_collection_rec[${zero_padded}]`, [same_situation_key, payload]);
    await global_context.globalState.update("data_collection_rec_count", rec_count + 1);
}
exports.data_collection_save_record = data_collection_save_record;
function data_collection_prepare_package_for_sidebar() {
    if (!global.global_context) {
        return;
    }
    let global_context = global.global_context;
    let rec_count_ = global_context.globalState.get("data_collection_rec_count");
    let rec_count = 0;
    if (rec_count_ !== undefined) {
        rec_count = rec_count_;
    }
    let result = {};
    for (let i = 0; i < rec_count; i++) {
        let zero_padded = i.toString().padStart(4, "0");
        let rec = global_context.globalState.get(`data_collection_rec[${zero_padded}]`);
        if (rec === undefined) {
            continue;
        }
        let rec_ = rec;
        let same_situation_key = rec_[0];
        let payload = rec_[1];
        if (result[same_situation_key] === undefined) {
            result[same_situation_key] = [];
        }
        result[same_situation_key].push(payload);
    }
    return result;
}
exports.data_collection_prepare_package_for_sidebar = data_collection_prepare_package_for_sidebar;
async function data_collection_hurray_send_to_mothership() {
    const apiKey = userLogin.secret_api_key();
    if (!apiKey) {
        return;
    }
    const url = "https://www.smallcloud.ai/v1/report-to-mothership";
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
    };
    let req = new fetchH2.Request(url, {
        method: "POST",
        headers: headers,
        // body: body,
        redirect: "follow",
        cache: "no-cache",
        referrer: "no-referrer",
    });
    try {
        let ans = await fetchH2.fetch(req);
        let json = await ans.json();
        // if (json.retcode === "OK") {
        //     usageStats.report_success_or_failure(true, "data collection", url, "", "");
    }
    catch (error) {
        console.log(["collection", "error", error]);
    }
}
exports.data_collection_hurray_send_to_mothership = data_collection_hurray_send_to_mothership;
//# sourceMappingURL=dataCollection.js.map