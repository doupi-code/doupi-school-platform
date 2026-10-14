import json

with open("maintenance/approved_cleanup.json", "r", encoding="utf-8") as f:
    data = json.load(f)

pids = {r["print_id"]: r for r in data["records"]}
for target in [289, 290, 386, 388, 394, 397, 637]:
    if target in pids:
        print(f"已包含 #{target}: old={pids[target]['old_page_count']}, new={pids[target]['new_page_count']}, reason={pids[target]['reason']}")
    else:
        print(f"未包含 #{target}")
