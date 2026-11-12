import { useState, useEffect, useMemo } from "react";
import type { Semester, Course } from "./types";

const GRADE_OPTIONS = [
  { label: "O (Outstanding)", points: 10 },
  { label: "A+ (Excellent)", points: 9 },
  { label: "A (Very Good)", points: 8 },
  { label: "B+ (Good)", points: 7 },
  { label: "B (Above Average)", points: 6 },
  { label: "C (Average)", points: 5 },
  { label: "P (Pass)", points: 4 },
  { label: "F (Fail)", points: 0 },
];

const INITIAL_SEMESTERS: Semester[] = [
  {
    id: "sem-1",
    number: 1,
    courses: [
      { id: "c1", name: "Engineering Mathematics I", credits: 4, gradePoint: 9 },
      { id: "c2", name: "Engineering Physics", credits: 4, gradePoint: 8 },
      { id: "c3", name: "Programming in C", credits: 3, gradePoint: 10 },
      { id: "c4", name: "Basic Electrical Engineering", credits: 3, gradePoint: 8 },
      { id: "c5", name: "Physics & Programming Labs", credits: 2, gradePoint: 9 },
    ],
  },
  {
    id: "sem-2",
    number: 2,
    courses: [
      { id: "c6", name: "Engineering Mathematics II", credits: 4, gradePoint: 9 },
      { id: "c7", name: "Data Structures & Algorithms", credits: 4, gradePoint: 10 },
      { id: "c8", name: "Digital Logic Design", credits: 3, gradePoint: 8 },
      { id: "c9", name: "Object Oriented Java", credits: 3, gradePoint: 9 },
      { id: "c10", name: "Data Structures Lab", credits: 2, gradePoint: 10 },
    ],
  },
  {
    id: "sem-3",
    number: 3,
    courses: [
      { id: "c11", name: "Discrete Mathematical Structures", credits: 4, gradePoint: 8 },
      { id: "c12", name: "Operating Systems", credits: 4, gradePoint: 9 },
      { id: "c13", name: "Computer Organization & Architecture", credits: 3, gradePoint: 8 },
      { id: "c14", name: "Design & Analysis of Algorithms", credits: 4, gradePoint: 9 },
      { id: "c15", name: "OS & DAA Lab", credits: 2, gradePoint: 9 },
    ],
  },
];

export default function App() {
  const [semesters, setSemesters] = useState<Semester[]>(() => {
    try {
      const saved = localStorage.getItem("gradeorbit_semesters");
      if (saved) return JSON.parse(saved);
    } catch {
      // noop
    }
    return INITIAL_SEMESTERS;
  });

  const [activeTab, setActiveTab] = useState<"calculator" | "predictor">("calculator");

  // Predictor state
  const [targetCgpa, setTargetCgpa] = useState<number>(8.5);
  const [totalDegreeCredits, setTotalDegreeCredits] = useState<number>(160);

  useEffect(() => {
    try {
      localStorage.setItem("gradeorbit_semesters", JSON.stringify(semesters));
    } catch {
      // noop
    }
  }, [semesters]);

  // Calculate SGPA for each semester
  const semesterMetrics = useMemo(() => {
    return semesters.map((sem) => {
      let earnedPoints = 0;
      let totalCredits = 0;
      sem.courses.forEach((c) => {
        earnedPoints += c.credits * c.gradePoint;
        totalCredits += c.credits;
      });
      const sgpa = totalCredits > 0 ? earnedPoints / totalCredits : 0;
      return { semId: sem.id, sgpa, totalCredits, earnedPoints };
    });
  }, [semesters]);

  // Overall CGPA
  const overallCgpa = useMemo(() => {
    let totalPoints = 0;
    let totalCredits = 0;
    semesterMetrics.forEach((m) => {
      totalPoints += m.earnedPoints;
      totalCredits += m.totalCredits;
    });
    return totalCredits > 0 ? totalPoints / totalCredits : 0;
  }, [semesterMetrics]);

  const totalCompletedCredits = useMemo(() => {
    return semesterMetrics.reduce((acc, m) => acc + m.totalCredits, 0);
  }, [semesterMetrics]);

  // Target Forecast Solver
  const forecastResult = useMemo(() => {
    const remainingCredits = Math.max(0, totalDegreeCredits - totalCompletedCredits);
    if (remainingCredits <= 0) {
      return {
        feasible: overallCgpa >= targetCgpa,
        requiredSgpa: 0,
        remainingCredits: 0,
        maxPossibleCgpa: overallCgpa,
      };
    }

    const currentEarnedPoints = overallCgpa * totalCompletedCredits;
    const requiredTotalPoints = targetCgpa * totalDegreeCredits;
    const pointsNeeded = requiredTotalPoints - currentEarnedPoints;
    const requiredSgpa = pointsNeeded / remainingCredits;
    const maxPossibleCgpa = (currentEarnedPoints + 10.0 * remainingCredits) / totalDegreeCredits;

    return {
      feasible: requiredSgpa <= 10.0,
      requiredSgpa,
      remainingCredits,
      maxPossibleCgpa,
    };
  }, [overallCgpa, totalCompletedCredits, targetCgpa, totalDegreeCredits]);

  const addSemester = () => {
    const nextNum = semesters.length + 1;
    const newSem: Semester = {
      id: `sem-${Date.now()}`,
      number: nextNum,
      courses: [
        { id: `c-${Date.now()}-1`, name: "Core Course I", credits: 4, gradePoint: 9 },
        { id: `c-${Date.now()}-2`, name: "Core Course II", credits: 3, gradePoint: 8 },
        { id: `c-${Date.now()}-3`, name: "Elective Course", credits: 3, gradePoint: 9 },
      ],
    };
    setSemesters((prev) => [...prev, newSem]);
  };

  const removeSemester = (id: string) => {
    if (confirm("Remove this semester?")) {
      setSemesters((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const addCourse = (semId: string) => {
    setSemesters((prev) =>
      prev.map((s) => {
        if (s.id !== semId) return s;
        return {
          ...s,
          courses: [
            ...s.courses,
            { id: `c-${Date.now()}`, name: "New Course", credits: 3, gradePoint: 8 },
          ],
        };
      })
    );
  };

  const updateCourse = (semId: string, courseId: string, field: keyof Course, value: any) => {
    setSemesters((prev) =>
      prev.map((s) => {
        if (s.id !== semId) return s;
        return {
          ...s,
          courses: s.courses.map((c) => {
            if (c.id !== courseId) return c;
            return { ...c, [field]: value };
          }),
        };
      })
    );
  };

  const removeCourse = (semId: string, courseId: string) => {
    setSemesters((prev) =>
      prev.map((s) => {
        if (s.id !== semId) return s;
        return { ...s, courses: s.courses.filter((c) => c.id !== courseId) };
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#edeae3] flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0e1017]/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg bg-[#38bdf8]/15 border border-[#38bdf8]/40 flex items-center justify-center text-lg">
            🪐
          </span>
          <div>
            <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <span>GradeOrbit</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#38bdf8]">
                v1.0 Free Student App
              </span>
            </h1>
            <p className="text-xs text-[#8c8f9a]">
              Engineering SGPA/CGPA Calculator &amp; Honors Target Forecaster
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 bg-[#141622] p-1 rounded-lg border border-white/10 font-mono text-xs">
          <button
            onClick={() => setActiveTab("calculator")}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === "calculator" ? "bg-[#38bdf8] text-[#0a0a0f] font-semibold" : "text-[#8c8f9a] hover:text-white"
            }`}
          >
            Semester Tracker
          </button>
          <button
            onClick={() => setActiveTab("predictor")}
            className={`px-3 py-1 rounded transition-colors ${
              activeTab === "predictor" ? "bg-[#38bdf8] text-[#0a0a0f] font-semibold" : "text-[#8c8f9a] hover:text-white"
            }`}
          >
            Target Predictor 🎯
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 flex flex-col gap-6">
        {/* Cumulative CGPA Banner Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-[#11131c] border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-[#8c8f9a]">
                Cumulative CGPA
              </span>
              <div className="flex items-baseline gap-2 mt-1 font-mono">
                <span className="text-3xl font-bold text-[#38bdf8]">{overallCgpa.toFixed(2)}</span>
                <span className="text-xs text-[#8c8f9a]">/ 10.0</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-[#38bdf8]/30 flex items-center justify-center font-mono text-sm font-semibold text-white">
              🎓
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#11131c] border border-white/10 flex flex-col justify-center font-mono">
            <span className="text-xs uppercase tracking-wider text-[#8c8f9a]">
              Earned Degree Credits
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-bold text-white">{totalCompletedCredits}</span>
              <span className="text-sm text-[#8c8f9a]">/ {totalDegreeCredits} Total</span>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#11131c] border border-white/10 flex flex-col justify-center font-mono">
            <span className="text-xs uppercase tracking-wider text-[#8c8f9a]">
              Academic Classification
            </span>
            <div className="mt-1 text-sm font-medium text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8]" />
              <span>
                {overallCgpa >= 8.5
                  ? "First Class with Distinction (Honors)"
                  : overallCgpa >= 6.75
                  ? "First Class Division"
                  : overallCgpa >= 5.75
                  ? "Second Class Division"
                  : "Pass Division"}
              </span>
            </div>
          </div>
        </div>

        {/* TAB 1: Semester Calculator */}
        {activeTab === "calculator" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-mono uppercase tracking-wider text-[#8c8f9a]">
                Semester Breakdown ({semesters.length} Semesters Logged)
              </h2>
              <button
                onClick={addSemester}
                className="px-3 py-1.5 rounded-lg bg-[#38bdf8] hover:bg-[#38bdf8]/90 text-[#0a0a0f] text-xs font-semibold font-mono flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <span>+</span>
                <span>Add Semester</span>
              </button>
            </div>

            <div className="flex flex-col gap-5">
              {semesters.map((sem, sIdx) => {
                const metric = semesterMetrics[sIdx];
                return (
                  <div
                    key={sem.id}
                    className="p-5 rounded-2xl bg-[#11131c] border border-white/10 flex flex-col gap-4"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-md bg-[#38bdf8]/15 border border-[#38bdf8]/30 font-mono text-xs font-semibold text-[#38bdf8]">
                          Semester {sem.number}
                        </span>
                        <div className="font-mono text-xs text-[#8c8f9a]">
                          <span>SGPA: </span>
                          <span className="text-white font-bold text-sm">
                            {metric?.sgpa.toFixed(2) || "0.00"}
                          </span>
                          <span className="ml-2">({metric?.totalCredits || 0} Credits)</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => addCourse(sem.id)}
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono text-[#38bdf8] transition-colors"
                        >
                          + Course
                        </button>
                        <button
                          onClick={() => removeSemester(sem.id)}
                          className="p-1 text-[#8c8f9a] hover:text-[#ef4444] text-xs font-mono transition-colors"
                          title="Delete Semester"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {/* Course rows */}
                    <div className="flex flex-col gap-2 font-mono text-xs">
                      {sem.courses.map((course) => (
                        <div
                          key={course.id}
                          className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-[#0e1017] border border-white/5"
                        >
                          <div className="col-span-6 sm:col-span-5">
                            <input
                              type="text"
                              value={course.name}
                              onChange={(e) =>
                                updateCourse(sem.id, course.id, "name", e.target.value)
                              }
                              className="w-full bg-transparent text-white focus:outline-none focus:text-[#38bdf8]"
                            />
                          </div>
                          <div className="col-span-2 sm:col-span-2 flex items-center gap-1">
                            <span className="text-[#8c8f9a]">Cr:</span>
                            <input
                              type="number"
                              min={1}
                              max={6}
                              value={course.credits}
                              onChange={(e) =>
                                updateCourse(
                                  sem.id,
                                  course.id,
                                  "credits",
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-12 bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-center text-white focus:outline-none"
                            />
                          </div>
                          <div className="col-span-3 sm:col-span-4">
                            <select
                              value={course.gradePoint}
                              onChange={(e) =>
                                updateCourse(
                                  sem.id,
                                  course.id,
                                  "gradePoint",
                                  parseInt(e.target.value)
                                )
                              }
                              className="w-full bg-[#141620] border border-white/10 rounded px-2 py-0.5 text-white focus:outline-none text-[11px] cursor-pointer"
                            >
                              {GRADE_OPTIONS.map((g) => (
                                <option key={g.points} value={g.points}>
                                  {g.label} ({g.points} pts)
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-1 text-right">
                            <button
                              onClick={() => removeCourse(sem.id, course.id)}
                              className="text-[#8c8f9a] hover:text-[#ef4444]"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Target Honors Predictor */}
        {activeTab === "predictor" && (
          <div className="p-6 sm:p-8 rounded-2xl bg-[#11131c] border border-white/10 flex flex-col gap-6 font-mono text-xs">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#38bdf8]">
                Honors Goal Predictor
              </span>
              <h2 className="text-xl font-bold text-white mt-1">
                Required SGPA Forecaster
              </h2>
              <p className="mt-1 text-xs text-[#8c8f9a] font-sans">
                Determine the exact minimum semester grade points you must maintain across your remaining coursework to graduate with your desired CGPA.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#0e1017] border border-white/10 flex flex-col gap-2">
                <span className="text-[#8c8f9a]">Desired Graduation CGPA Goal:</span>
                <input
                  type="number"
                  step="0.05"
                  min="5.0"
                  max="10.0"
                  value={targetCgpa}
                  onChange={(e) => setTargetCgpa(parseFloat(e.target.value) || 0)}
                  className="text-2xl font-bold text-[#38bdf8] bg-transparent border-b border-white/20 focus:outline-none pb-1"
                />
              </div>

              <div className="p-4 rounded-xl bg-[#0e1017] border border-white/10 flex flex-col gap-2">
                <span className="text-[#8c8f9a]">Total Degree Credits Scheme:</span>
                <input
                  type="number"
                  min="120"
                  max="200"
                  value={totalDegreeCredits}
                  onChange={(e) => setTotalDegreeCredits(parseInt(e.target.value) || 160)}
                  className="text-2xl font-bold text-white bg-transparent border-b border-white/20 focus:outline-none pb-1"
                />
              </div>
            </div>

            {/* Recommendation Result Card */}
            <div
              className={`p-6 rounded-2xl border flex flex-col gap-3 ${
                forecastResult.feasible
                  ? "bg-[#10b981]/10 border-[#10b981]/40"
                  : "bg-[#ef4444]/10 border-[#ef4444]/40"
              }`}
            >
              <div className="flex items-center gap-2 text-sm font-bold">
                <span>{forecastResult.feasible ? "🎯 Target Feasible" : "⚠️ Target Requires Adjustment"}</span>
              </div>

              {forecastResult.feasible ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-sans text-[#edeae3]">
                    To graduate with a <span className="font-bold text-[#38bdf8]">{targetCgpa} CGPA</span>, you need to maintain an average SGPA of:
                  </p>
                  <div className="text-4xl font-extrabold text-[#10b981] font-mono">
                    {forecastResult.requiredSgpa.toFixed(2)} SGPA
                  </div>
                  <p className="text-xs text-[#8c8f9a] font-sans">
                    Across your remaining {forecastResult.remainingCredits} credits. Maximum possible CGPA if you score 10.0 in all remaining courses is {forecastResult.maxPossibleCgpa.toFixed(2)}.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-sans text-[#edeae3]">
                    Reaching a {targetCgpa} CGPA is mathematically impossible on a 10.0 scale because it requires an average SGPA of:
                  </p>
                  <div className="text-4xl font-extrabold text-[#ef4444] font-mono">
                    {forecastResult.requiredSgpa.toFixed(2)} SGPA
                  </div>
                  <p className="text-xs text-[#8c8f9a] font-sans">
                    The highest possible CGPA you can graduate with by scoring straight 10.0s across all remaining {forecastResult.remainingCredits} credits is <span className="text-white font-bold">{forecastResult.maxPossibleCgpa.toFixed(2)}</span>.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
