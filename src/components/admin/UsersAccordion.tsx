"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, School, User as UserIcon } from "lucide-react";

interface UserData {
    id: string;
    name: string;
    email: string;
    course: string;
    yearLevel: string;
    section: string;
    balance: number;
    totalEarned: number;
    totalItems: number;
    status: string;
    
    joinedAt: string;
}

interface SectionGroup {
    section: string;
    users: UserData[];
}

interface YearGroup {
    yearLevel: string;
    sections: SectionGroup[];
}

interface CourseGroup {
    course: string;
    totalPoints: number;
    totalItems: number;
    years: YearGroup[];
}

const getCourseAccent = (course: string) => {
    const c = course.toUpperCase();
    
    // IT - Green
    if (c.includes("IT")) 
        return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", iconBg: "bg-emerald-100" };
    
    // CS - Red
    if (c.includes("CS")) 
        return { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", iconBg: "bg-red-100" };
    
    // TM - Black
    if (c.includes("TM")) 
        return { bg: "bg-zinc-100", text: "text-zinc-900", border: "border-zinc-300", iconBg: "bg-zinc-200" };
    
    // HM - Light Blue
    if (c.includes("HM")) 
        return { bg: "bg-sky-50", text: "text-sky-600", border: "border-sky-200", iconBg: "bg-sky-100" };
    
    // OAD - Pink
    if (c.includes("OAD")) 
        return { bg: "bg-pink-50", text: "text-pink-600", border: "border-pink-200", iconBg: "bg-pink-100" };

    // Education (Maroon) fallback
    if (c.includes("ED")) 
        return { bg: "bg-rose-50", text: "text-rose-900", border: "border-rose-200", iconBg: "bg-rose-100" };
    
    // Default fallback
    return { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", iconBg: "bg-gray-100" };
};

export default function UsersAccordion({ courses }: { courses: CourseGroup[] }) {
    // Nav States
    const [selectedCourse, setSelectedCourse] = useState<string>(courses[0]?.course || "");
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [selectedSection, setSelectedSection] = useState<string>("");

    if (!courses || courses.length === 0) {
        return (
            <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
                <UserIcon className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 font-medium">No students found.</p>
            </div>
        );
    }

    const activeCourse = courses.find((c) => c.course === selectedCourse) || courses[0];
    const accent = getCourseAccent(activeCourse.course);
    const totalStudents = activeCourse.years.reduce((acc, y) => acc + y.sections.reduce((sAcc, s) => sAcc + s.users.length, 0), 0);

    // Filter logic
    const yearList = activeCourse.years;
    const currentYearData = yearList.find(y => y.yearLevel === selectedYear) || yearList[0];
    const sectionList = currentYearData?.sections || [];
    const currentSectionData = sectionList.find(s => s.section === selectedSection) || sectionList[0];

    // Reset subordinate selections when course changes
    const handleCourseSelect = (c: string) => {
        setSelectedCourse(c);
        setSelectedYear("");
        setSelectedSection("");
    };

    const displayYear = selectedYear || currentYearData?.yearLevel;
    const displaySection = selectedSection || currentSectionData?.section;

    return (
        <div className="space-y-6">
            {/* 1. Horizontal Course Tabs */}
            <div className="flex w-full items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {courses.map((courseGroup) => {
                    const isSelected = selectedCourse === courseGroup.course;
                    const ca = getCourseAccent(courseGroup.course);
                    return (
                        <button
                            key={courseGroup.course}
                            onClick={() => handleCourseSelect(courseGroup.course)}
                            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold transition-all whitespace-nowrap ${
                                isSelected
                                    ? `${ca.bg} ring-1 ring-inset ${ca.border} ${ca.text} shadow-sm`
                                    : "bg-white border border-gray-100 text-gray-400 hover:bg-gray-50"
                            }`}
                        >
                            <School className={`h-4 w-4 ${isSelected ? ca.text : "text-gray-300"}`} />
                            {courseGroup.course}
                        </button>
                    );
                })}
            </div>

            {/* Main Selection Area */}
            <div className={`overflow-hidden rounded-2xl border ${accent.border} bg-white shadow-sm transition-all`}>
                {/* Active Course Header Banner */}
                <div className={`flex w-full items-center justify-between px-6 py-4 ${accent.bg} border-b ${accent.border}`}>
                    <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent.iconBg} shadow-sm`}>
                            <School className={`h-5 w-5 ${accent.text}`} />
                        </div>
                        <div>
                            <p className="text-base font-black text-gray-900">{activeCourse.course}</p>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                                {totalStudents} Students • {activeCourse.totalPoints} Pts • {activeCourse.totalItems} Items
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Horizontal Year Pills */}
                <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/10">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Select Year Level</p>
                    <div className="flex flex-wrap gap-2">
                        {yearList.map((y) => {
                            const isYearSelected = displayYear === y.yearLevel;
                            return (
                                <button
                                    key={y.yearLevel}
                                    onClick={() => { setSelectedYear(y.yearLevel); setSelectedSection(""); }}
                                    className={`rounded-lg px-4 py-2 text-[11px] font-bold transition-all ${
                                        isYearSelected 
                                            ? `${accent.bg} ${accent.text} ring-1 ${accent.border}` 
                                            : "bg-white text-gray-400 border border-gray-100 hover:bg-gray-50"
                                    }`}
                                >
                                    {y.yearLevel}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 3. Horizontal Section Pills */}
                {displayYear && (
                    <div className="px-6 py-4 border-b border-gray-50 bg-white">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Select Section</p>
                        <div className="flex flex-wrap gap-2">
                            {sectionList.map((s) => {
                                const isSecSelected = displaySection === s.section;
                                return (
                                    <button
                                        key={s.section}
                                        onClick={() => setSelectedSection(s.section)}
                                        className={`rounded-lg px-4 py-2 text-[11px] font-bold transition-all ${
                                            isSecSelected 
                                                ? "bg-gray-900 text-white shadow-sm" 
                                                : "bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100"
                                        }`}
                                    >
                                        SECTION {s.section}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 4. Student Table Tier */}
                {currentSectionData && (
                    <div className="p-4">
                        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-5 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-gray-400">Student</th>
                                        <th className="px-5 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-gray-400">Points</th>
                                        <th className="px-5 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-gray-400">Items</th>
                                        <th className="px-5 py-2.5 text-left text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {currentSectionData.users.map((u) => (
                                        <tr key={u.id} className="transition-colors hover:bg-gray-50/50">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${accent.bg} ${accent.text} text-[10px] font-black`}>
                                                        {u.name ? u.name[0].toUpperCase() : u.email[0].toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[12px] font-bold text-gray-900 truncate max-w-[150px]">{u.name || "Student"}</span>
                                                        <span className="text-[9px] font-medium text-gray-400">{u.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <span className="text-xs font-black text-emerald-600">{u.totalEarned.toLocaleString()}</span>
                                                <span className="ml-1 text-[9px] font-bold text-gray-400 uppercase">pts</span>
                                            </td>
                                            <td className="px-5 py-3 text-xs font-bold text-gray-600">{u.totalItems}</td>
                                            <td className="px-5 py-3 text-right">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter ${
                                                    u.status === "ACTIVE" 
                                                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                                        : "bg-gray-50 text-gray-400 border border-gray-100"
                                                }`}>
                                                    {u.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

