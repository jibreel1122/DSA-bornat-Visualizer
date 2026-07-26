import type { AlgorithmMeta, AlgorithmModule } from "@/lib/engine/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ExpansionDLoader = () => Promise<{ default: AlgorithmModule<any, any> }>;

export const metas: AlgorithmMeta[] = [
  { slug: "matrix-chain-multiplication", title: "Matrix Chain Multiplication", titleAr: "ضرب سلسلة المصفوفات", category: "dynamic-programming", difficulty: "Advanced", tags: ["dynamic programming", "interval DP", "parenthesization"], tagsAr: ["البرمجة الديناميكية", "برمجة الفترات", "ترتيب الأقواس"], summary: "Finds the parenthesization requiring the fewest scalar multiplications.", summaryAr: "يجد ترتيب الأقواس الذي يحتاج إلى أقل عدد من عمليات الضرب القياسية.", renderer: "table" },
  { slug: "rod-cutting", title: "Rod Cutting", titleAr: "تقطيع القضيب", category: "dynamic-programming", difficulty: "Intermediate", tags: ["dynamic programming", "unbounded choices", "optimization"], tagsAr: ["البرمجة الديناميكية", "اختيارات غير محدودة", "التحسين"], summary: "Maximizes sale revenue by choosing the best sequence of rod cuts.", summaryAr: "يعظّم إيراد البيع باختيار أفضل تسلسل لتقطيع القضيب.", renderer: "table" },
  { slug: "subset-sum-dp", title: "Subset Sum DP", titleAr: "مجموع المجموعة الجزئية بالبرمجة الديناميكية", category: "dynamic-programming", difficulty: "Intermediate", tags: ["dynamic programming", "subset", "decision problem"], tagsAr: ["البرمجة الديناميكية", "مجموعة جزئية", "مسألة قرار"], summary: "Determines whether some subset reaches an exact nonnegative target.", summaryAr: "يحدد ما إذا كانت مجموعة جزئية تحقق هدفاً غير سالب بدقة.", renderer: "table" },
  { slug: "word-break", title: "Word Break", titleAr: "تقسيم الكلمات", category: "dynamic-programming", difficulty: "Intermediate", tags: ["dynamic programming", "strings", "dictionary"], tagsAr: ["البرمجة الديناميكية", "السلاسل النصية", "القاموس"], summary: "Checks whether a string can be segmented entirely into dictionary words.", summaryAr: "يفحص إمكانية تقسيم النص بالكامل إلى كلمات موجودة في القاموس.", renderer: "table" },
  { slug: "egg-dropping", title: "Egg Dropping", titleAr: "مسألة إسقاط البيض", category: "dynamic-programming", difficulty: "Advanced", tags: ["dynamic programming", "minimax", "decision"], tagsAr: ["البرمجة الديناميكية", "تصغير الأسوأ", "القرار"], summary: "Minimizes worst-case drops needed to locate a critical floor.", summaryAr: "يقلل عدد الإسقاطات في أسوأ حالة لتحديد الطابق الحرج.", renderer: "table" },
  { slug: "longest-palindromic-subsequence", title: "Longest Palindromic Subsequence", titleAr: "أطول تتابع فرعي متناظر", category: "dynamic-programming", difficulty: "Intermediate", tags: ["dynamic programming", "palindrome", "interval DP"], tagsAr: ["البرمجة الديناميكية", "التناظر", "برمجة الفترات"], summary: "Finds the longest subsequence that reads identically in both directions.", summaryAr: "يجد أطول تتابع فرعي يُقرأ بالشكل نفسه في الاتجاهين.", renderer: "table" },
  { slug: "palindrome-partitioning", title: "Palindrome Partitioning", titleAr: "تقسيم النص إلى مقاطع متناظرة", category: "dynamic-programming", difficulty: "Advanced", tags: ["dynamic programming", "palindrome", "partitioning"], tagsAr: ["البرمجة الديناميكية", "التناظر", "التقسيم"], summary: "Computes the minimum cuts that partition a string into palindromes.", summaryAr: "يحسب أقل عدد من القطوع لتقسيم النص إلى مقاطع متناظرة.", renderer: "table" },
  { slug: "catalan-numbers", title: "Catalan Numbers", titleAr: "أعداد كاتالان", category: "dynamic-programming", difficulty: "Intermediate", tags: ["dynamic programming", "combinatorics", "binary trees"], tagsAr: ["البرمجة الديناميكية", "التوافقيات", "الأشجار الثنائية"], summary: "Builds Catalan numbers from all left/right structural splits.", summaryAr: "يبني أعداد كاتالان من جميع تقسيمات البنية إلى يسار ويمين.", renderer: "table" },
  { slug: "greedy-coin-change", title: "Greedy Coin Change", titleAr: "فك العملات بالطريقة الجشعة", category: "greedy", difficulty: "Beginner", tags: ["greedy", "coin change", "canonical systems"], tagsAr: ["الخوارزميات الجشعة", "فك العملات", "أنظمة العملات القياسية"], summary: "Repeatedly takes the largest denomination that does not exceed the remainder.", summaryAr: "يأخذ مراراً أكبر فئة لا تتجاوز المبلغ المتبقي.", renderer: "array" },
  { slug: "interval-partitioning", title: "Interval Partitioning", titleAr: "تقسيم الفترات على الموارد", category: "greedy", difficulty: "Intermediate", tags: ["greedy", "intervals", "scheduling", "priority queue"], tagsAr: ["الخوارزميات الجشعة", "الفترات", "الجدولة", "طابور الأولوية"], summary: "Assigns intervals to the minimum number of non-overlapping resources.", summaryAr: "يسند الفترات إلى أقل عدد من الموارد غير المتداخلة.", renderer: "table" },
  { slug: "optimal-merge-pattern", title: "Optimal Merge Pattern", titleAr: "نمط الدمج الأمثل", category: "greedy", difficulty: "Intermediate", tags: ["greedy", "min heap", "merge cost"], tagsAr: ["الخوارزميات الجشعة", "الكومة الصغرى", "كلفة الدمج"], summary: "Minimizes total pairwise merge cost by repeatedly merging the two smallest files.", summaryAr: "يقلل كلفة الدمج الكلية بدمج أصغر ملفين مراراً.", renderer: "array" },
  { slug: "greedy-set-cover", title: "Greedy Set Cover", titleAr: "غطاء المجموعات الجشع", category: "greedy", difficulty: "Advanced", tags: ["greedy", "set cover", "approximation"], tagsAr: ["الخوارزميات الجشعة", "غطاء المجموعات", "التقريب"], summary: "Repeatedly selects the set covering the most still-uncovered elements.", summaryAr: "يختار مراراً المجموعة التي تغطي أكبر عدد من العناصر غير المغطاة.", renderer: "table" },
  { slug: "graph-coloring", title: "Graph Coloring", titleAr: "تلوين الرسم البياني", category: "backtracking", difficulty: "Advanced", tags: ["backtracking", "graphs", "constraint satisfaction"], tagsAr: ["التراجع", "الرسوم البيانية", "إرضاء القيود"], summary: "Assigns bounded colors so adjacent vertices never share a color.", summaryAr: "يسند ألواناً محدودة بحيث لا يشترك رأسان متجاوران في اللون نفسه.", renderer: "graph" },
  { slug: "knights-tour", title: "Knight's Tour", titleAr: "جولة الحصان", category: "backtracking", difficulty: "Advanced", tags: ["backtracking", "chessboard", "Hamiltonian path"], tagsAr: ["التراجع", "رقعة الشطرنج", "مسار هاملتوني"], summary: "Visits every board square exactly once using legal knight moves.", summaryAr: "يزور كل مربع في الرقعة مرة واحدة بالضبط باستخدام حركات الحصان القانونية.", renderer: "grid" },
  { slug: "word-search", title: "Word Search", titleAr: "البحث عن كلمة في شبكة", category: "backtracking", difficulty: "Intermediate", tags: ["backtracking", "grid", "strings", "DFS"], tagsAr: ["التراجع", "الشبكة", "السلاسل النصية", "البحث بالعمق"], summary: "Finds a word along orthogonally adjacent cells without reusing a cell.", summaryAr: "يجد كلمة عبر خلايا متجاورة أفقياً أو عمودياً دون إعادة استخدام خلية.", renderer: "grid" },
  { slug: "generate-parentheses", title: "Generate Parentheses", titleAr: "توليد الأقواس الصحيحة", category: "backtracking", difficulty: "Intermediate", tags: ["backtracking", "Catalan", "recursion", "strings"], tagsAr: ["التراجع", "كاتالان", "العودية", "السلاسل النصية"], summary: "Generates every balanced parenthesis string with a fixed number of pairs.", summaryAr: "يولد كل سلسلة أقواس متوازنة لعدد ثابت من الأزواج.", renderer: "callstack" },
];

export const loaders: Record<string, ExpansionDLoader> = {
  "matrix-chain-multiplication": () => import("./matrix-chain-multiplication"),
  "rod-cutting": () => import("./rod-cutting"),
  "subset-sum-dp": () => import("./subset-sum-dp"),
  "word-break": () => import("./word-break"),
  "egg-dropping": () => import("./egg-dropping"),
  "longest-palindromic-subsequence": () => import("./longest-palindromic-subsequence"),
  "palindrome-partitioning": () => import("./palindrome-partitioning"),
  "catalan-numbers": () => import("./catalan-numbers"),
  "greedy-coin-change": () => import("./greedy-coin-change"),
  "interval-partitioning": () => import("./interval-partitioning"),
  "optimal-merge-pattern": () => import("./optimal-merge-pattern"),
  "greedy-set-cover": () => import("./greedy-set-cover"),
  "graph-coloring": () => import("./graph-coloring"),
  "knights-tour": () => import("./knights-tour"),
  "word-search": () => import("./word-search"),
  "generate-parentheses": () => import("./generate-parentheses"),
};

export async function loadExpansionD(slug: string): Promise<AlgorithmModule | null> {
  const loader = loaders[slug];
  if (!loader) return null;
  return (await loader()).default as AlgorithmModule;
}
