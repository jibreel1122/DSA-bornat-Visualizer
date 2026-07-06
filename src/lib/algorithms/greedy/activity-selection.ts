import type { AlgorithmModule, CellState, Step, TableFrame } from "@/lib/engine/types";

type Activity = { start: number; finish: number };
type Input = { activities: Activity[] };

function generate(input: Input): Step<TableFrame>[] {
  // sort by finish time (the greedy key), remembering original indices
  const acts = input.activities
    .map((a, i) => ({ ...a, id: i + 1 }))
    .sort((x, y) => x.finish - y.finish);
  const steps: Step<TableFrame>[] = [];
  let comparisons = 0;

  const status = new Array(acts.length).fill(""); // "selected" | "rejected" | ""
  const selected: number[] = [];
  let lastFinish = -Infinity;

  const rowLabels = acts.map((a) => `A${a.id}`);
  const colLabels = ["start", "finish", "status"];

  const frame = (activeRow: number | null, compareVal: number | null, description: string, codeLine: number): void => {
    const cells = acts.map((a, i) => {
      const rowState: CellState | undefined =
        activeRow === i ? "active" : status[i] === "selected" ? "sorted" : status[i] === "rejected" ? "discarded" : undefined;
      const statusText = status[i] === "selected" ? "✓ take" : status[i] === "rejected" ? "✗ skip" : "—";
      return [
        { value: a.start, state: rowState },
        { value: a.finish, state: rowState },
        { value: statusText, state: rowState },
      ];
    });
    steps.push({
      frame: {
        rowLabels,
        colLabels,
        cells,
        aux: [
          { label: "Selected", values: selected.length ? selected.map((id) => `A${id}`) : ["—"] },
          { label: "Last finish", values: [lastFinish === -Infinity ? "−∞" : lastFinish] },
        ],
        note: compareVal !== null ? `need start ≥ ${compareVal}` : undefined,
      },
      description,
      codeLine,
      counters: { comparisons, selected: selected.length },
    });
  };

  frame(null, null, `Greedy activity selection: sort by finish time, then always take the next compatible activity.`, 0);

  for (let i = 0; i < acts.length; i++) {
    const a = acts[i];
    comparisons++;
    frame(i, lastFinish === -Infinity ? null : lastFinish, `Consider A${a.id} [${a.start}, ${a.finish}].`, 2);
    if (a.start >= lastFinish) {
      status[i] = "selected";
      selected.push(a.id);
      lastFinish = a.finish;
      frame(i, null, `A${a.id} starts at ${a.start} ≥ last finish — select it. Update last finish to ${a.finish}.`, 3);
    } else {
      status[i] = "rejected";
      frame(i, lastFinish, `A${a.id} starts at ${a.start} < last finish ${lastFinish} — conflict, skip it.`, 4);
    }
  }

  frame(null, null, `Done. Maximum ${selected.length} non-overlapping activities: ${selected.map((id) => `A${id}`).join(", ")}.`, 5);
  return steps;
}

function randomActivities(level: number, rng: { int: (a: number, b: number) => number }): Input {
  const n = Math.min(8, 4 + Math.floor(level / 1.2));
  const activities: Activity[] = [];
  for (let i = 0; i < n; i++) {
    const start = rng.int(0, 12);
    const finish = start + rng.int(1, 5);
    activities.push({ start, finish });
  }
  return { activities };
}

const mod: AlgorithmModule<TableFrame, Input> = {
  slug: "activity-selection",
  title: "Activity Selection",
  category: "greedy",
  difficulty: "Beginner",
  tags: ["greedy", "interval scheduling", "sorting"],
  summary: "Selects the maximum number of non-overlapping activities by always taking the one that finishes earliest.",
  renderer: "table",
  pseudocode: [
    "procedure activitySelection(activities)",
    "  sort activities by finish time",
    "  consider each activity in order:",
    "    if start >= lastFinish: select it",
    "      update lastFinish = its finish",
    "    else: reject (it overlaps)",
    "  return the selected set",
  ],
  code: {
    pseudocode: `sort activities by finish time
lastFinish = -inf; selected = []
for a in activities:
  if a.start >= lastFinish:
    selected.append(a)
    lastFinish = a.finish
return selected`,
    c: `// activities sorted by finish time
int select(int start[], int finish[], int n) {
    int last = -1, count = 0;
    for (int i = 0; i < n; i++)
        if (start[i] >= last) { count++; last = finish[i]; }
    return count;
}`,
    cpp: `int activitySelection(vector<pair<int,int>>& a) { // (finish, start)
    sort(a.begin(), a.end());
    int last = INT_MIN, count = 0;
    for (auto& [f, s] : a)
        if (s >= last) { count++; last = f; }
    return count;
}`,
    java: `int activitySelection(int[] start, int[] finish) {
    // assume sorted by finish
    int last = Integer.MIN_VALUE, count = 0;
    for (int i = 0; i < start.length; i++)
        if (start[i] >= last) { count++; last = finish[i]; }
    return count;
}`,
    python: `def activity_selection(activities):
    activities.sort(key=lambda a: a[1])  # by finish
    last, chosen = float('-inf'), []
    for start, finish in activities:
        if start >= last:
            chosen.append((start, finish))
            last = finish
    return chosen`,
    javascript: `function activitySelection(activities) {
  activities.sort((a, b) => a.finish - b.finish);
  let last = -Infinity;
  const chosen = [];
  for (const a of activities)
    if (a.start >= last) { chosen.push(a); last = a.finish; }
  return chosen;
}`,
    typescript: `interface Act { start: number; finish: number; }
function activitySelection(activities: Act[]): Act[] {
  activities.sort((a, b) => a.finish - b.finish);
  let last = -Infinity;
  const chosen: Act[] = [];
  for (const a of activities)
    if (a.start >= last) { chosen.push(a); last = a.finish; }
  return chosen;
}`,
    csharp: `List<(int s, int f)> ActivitySelection(List<(int s, int f)> acts) {
    acts.Sort((a, b) => a.f - b.f);
    int last = int.MinValue; var chosen = new List<(int, int)>();
    foreach (var a in acts)
        if (a.s >= last) { chosen.Add(a); last = a.f; }
    return chosen;
}`,
    go: `func activitySelection(acts [][2]int) [][2]int { // [start, finish]
	sort.Slice(acts, func(i, j int) bool { return acts[i][1] < acts[j][1] })
	last, chosen := math.MinInt, [][2]int{}
	for _, a := range acts {
		if a[0] >= last {
			chosen = append(chosen, a)
			last = a[1]
		}
	}
	return chosen
}`,
    rust: `fn activity_selection(mut acts: Vec<(i32, i32)>) -> Vec<(i32, i32)> {
    acts.sort_by_key(|a| a.1); // by finish
    let mut last = i32::MIN;
    let mut chosen = Vec::new();
    for a in acts {
        if a.0 >= last { chosen.push(a); last = a.1; }
    }
    chosen
}`,
    kotlin: `fun activitySelection(acts: List<Pair<Int, Int>>): List<Pair<Int, Int>> {
    val sorted = acts.sortedBy { it.second } // finish
    var last = Int.MIN_VALUE
    val chosen = mutableListOf<Pair<Int, Int>>()
    for (a in sorted)
        if (a.first >= last) { chosen.add(a); last = a.second }
    return chosen
}`,
    swift: `func activitySelection(_ acts: [(start: Int, finish: Int)]) -> [(Int, Int)] {
    let sorted = acts.sorted { $0.finish < $1.finish }
    var last = Int.min
    var chosen: [(Int, Int)] = []
    for a in sorted where a.start >= last {
        chosen.append((a.start, a.finish))
        last = a.finish
    }
    return chosen
}`,
  },
  content: {
    overview: `The activity-selection problem asks: given activities each with a start and finish time, what is the largest set you can attend if you can only do one at a time (no overlaps)? The greedy answer is beautifully simple — always pick the activity that finishes earliest among those still compatible with what you've chosen.

The intuition: finishing early frees up the most remaining time for future activities. Sorting by finish time and then sweeping through, taking any activity whose start is at or after the last chosen finish, provably yields an optimal (maximum-size) selection. It's a classic demonstration that a well-chosen greedy rule can be globally optimal.`,
    howItWorks: [
      "Sort all activities by their finish time (ascending).",
      "Track the finish time of the most recently selected activity (initially −∞).",
      "Scan the sorted activities in order.",
      "Select an activity if its start ≥ the last selected finish; then update the last finish.",
      "Reject any activity that starts before the last finish (it overlaps).",
    ],
    complexity: {
      time: { best: "O(n log n)", average: "O(n log n)", worst: "O(n log n)" },
      space: "O(1)",
      notes: "Dominated by the O(n log n) sort; the greedy sweep itself is O(n). If activities are pre-sorted by finish, selection is O(n). Space is O(1) beyond the input.",
    },
    applications: [
      "Scheduling non-conflicting meetings, jobs, or bookings in one resource",
      "Interval scheduling maximization in operations research",
      "Selecting the most tasks a single CPU/room can serve",
      "Broadcast/lecture scheduling and reservation systems",
    ],
    advantages: [
      "Optimal despite being greedy — provably maximum selection",
      "Simple and fast after sorting",
      "O(1) extra space",
      "Great illustration of the greedy-choice property",
    ],
    disadvantages: [
      "Only maximizes count — not weighted value (that needs DP)",
      "Requires sorting first",
      "Handles a single resource; multi-resource scheduling is harder",
    ],
    commonMistakes: [
      "Sorting by start time or duration instead of finish time (breaks optimality).",
      "Using > instead of ≥ when comparing start to last finish (edge-touching activities are compatible).",
      "Attempting a greedy solution for the weighted version, where it's not optimal.",
      "Forgetting to update the last-finish marker after selecting.",
    ],
    interviewQuestions: [
      "Why does sorting by finish time (not start time) yield the optimal selection?",
      "Prove the greedy-choice property for activity selection.",
      "How does the weighted version differ, and why does greedy fail there?",
      "How would you also return the actual chosen activities?",
      "What if two activities can touch endpoints — are they compatible?",
    ],
    summary:
      "Activity selection maximizes the number of non-overlapping activities by sorting on finish time and greedily taking each activity compatible with the last chosen one. It's O(n log n), provably optimal, and a canonical example of a correct greedy algorithm.",
    quiz: [
      { question: "Activities should be sorted by their…", options: ["Start time", "Finish time", "Duration", "Value"], answer: 1, explanation: "Choosing the earliest finish leaves the most room for later activities." },
      { question: "An activity is compatible with the current selection if its start is…", options: ["> last finish", "≥ last finish", "< last finish", "= 0"], answer: 1, explanation: "Start at or after the last finish means no overlap." },
      { question: "The overall time complexity is dominated by…", options: ["The greedy sweep", "The sort, O(n log n)", "O(n²) comparisons", "O(2ⁿ) search"], answer: 1, explanation: "Sorting is O(n log n); the linear sweep is cheaper." },
      { question: "Greedy activity selection maximizes…", options: ["Total value", "The number of activities", "Total duration", "Idle time"], answer: 1, explanation: "It finds the largest count of mutually compatible activities." },
      { question: "For the weighted version (maximize total value), greedy…", options: ["Still works", "Is not optimal; use dynamic programming", "Is faster", "Needs no sorting"], answer: 1, explanation: "Weighted interval scheduling requires DP because greedy can pick low-value early-finishers." },
    ],
  },
  inputFields: [
    { key: "activities", label: "Activities (start-finish)", placeholder: "1-4, 3-5, 0-6, 5-7, 3-9, 8-9", help: "Comma-separated start-finish pairs (up to 20).", list: true },
  ],
  defaultInput: (level, rng) => randomActivities(level, rng),
  parseInput: (fields) => {
    const parts = (fields.activities ?? "").split(/[,\n]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length < 1) throw new Error("Enter at least one activity as start-finish, e.g. 1-4.");
    if (parts.length > 20) throw new Error("Maximum 20 activities.");
    const activities: Activity[] = parts.map((p) => {
      const m = p.match(/^(\d+)\s*-\s*(\d+)$/);
      if (!m) throw new Error(`"${p}" is invalid. Use start-finish like 1-4.`);
      const start = Number(m[1]);
      const finish = Number(m[2]);
      if (finish <= start) throw new Error(`Activity "${p}" must finish after it starts.`);
      return { start, finish };
    });
    return { activities };
  },
  serializeInput: (input) => ({ activities: input.activities.map((a) => `${a.start}-${a.finish}`).join(", ") }),
  generate,
};

export default mod;
