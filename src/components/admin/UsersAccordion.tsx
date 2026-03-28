"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, School, User as UserIcon } from "lucide-react";

interface UserData {
    id: string;
    name: string;
    email: string;
    phone: string;
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
    
    // IT - Blue
    if (c.includes("IT")) 
        return { bg: "bg-blue-600", text: "text-white", border: "border-blue-600/20", iconBg: "bg-white/20" };
    
    // CS - Emerald
    if (c.includes("CS")) 
        return { bg: "bg-emerald-600", text: "text-white", border: "border-emerald-600/20", iconBg: "bg-white/20" };
    
    // TM - Indigo
    if (c.includes("TM")) 
        return { bg: "bg-indigo-600", text: "text-white", border: "border-indigo-600/20", iconBg: "bg-white/20" };
    
    // HM - Sky
    if (c.includes("HM")) 
        return { bg: "bg-sky-500", text: "text-white", border: "border-sky-500/20", iconBg: "bg-white/20" };
    
    // OAD - Teal
    if (c.includes("OAD")) 
        return { bg: "bg-teal-600", text: "text-white", border: "border-teal-600/20", iconBg: "bg-white/20" };

    // Education (Cyan)
    if (c.includes("ED")) 
        return { bg: "bg-cyan-600", text: "text-white", border: "border-cyan-600/20", iconBg: "bg-white/20" };
    
    // Default fallback
    return { bg: "bg-blue-500", text: "text-white", border: "border-blue-400/20", iconBg: "bg-white/10" };
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
                <p className="text-base text-gray-500 font-medium">No students found.</p>
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
        <div className="space-y-4">
            {/* 1. Horizontal Course Tabs */}
            <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {courses.map((courseGroup) => {
                    const isSelected = selectedCourse === courseGroup.course;
                    const ca = getCourseAccent(courseGroup.course);
                    const courseStudentCount = courseGroup.years.reduce((acc, y) => acc + y.sections.reduce((sAcc, s) => sAcc + s.users.length, 0), 0);
                    return (
                        <button
                            key={courseGroup.course}
                            onClick={() => handleCourseSelect(courseGroup.course)}
                            className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-bold transition-all whitespace-nowrap ${
                                isSelected
                                    ? `${ca.bg} ${ca.text} shadow-sm`
                                    : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50"
                            }`}
                        >
                            <School className={`h-3.5 w-3.5 ${isSelected ? ca.text : "text-gray-400"}`} />
                            {courseGroup.course}
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${isSelected ? "bg-white/20" : "bg-gray-100"}`}>
                                {courseStudentCount}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Main Selection Area */}
            <div className={`overflow-hidden rounded-xl border ${accent.border} bg-white shadow-sm transition-all`}>
                {/* Active Course Header Banner */}
                <div className={`flex w-full items-center justify-between px-6 py-4 ${accent.bg} border-b ${accent.border}`}>
                    <div className="flex items-center gap-4">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent.iconBg} shadow-sm`}>
                            <School className={`h-5 w-5 ${accent.text}`} />
                        </div>
                        <div>
                            <p className={`text-xl font-black ${accent.text}`}>{activeCourse.course}</p>
                            <p className={`text-[13px] ${accent.text} opacity-80 font-bold uppercase tracking-tighter`}>
                                {totalStudents} Students • {activeCourse.totalPoints} Pts • {activeCourse.totalItems} Items
                            </p>
                        </div>
                    </div>
                </div>

                {/* 2. Horizontal Year Pills */}
                <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/10">
                    <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-3">Select Year Level</p>
                    <div className="flex flex-wrap gap-2">
                        {yearList.map((y) => {
                            const isYearSelected = displayYear === y.yearLevel;
                            return (
                                <button
                                    key={y.yearLevel}
                                    onClick={() => { setSelectedYear(y.yearLevel); setSelectedSection(""); }}
                                    className={`rounded-lg px-4 py-2 text-[13px] font-bold transition-all ${
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
                        <p className="text-[12px] font-black text-gray-400 uppercase tracking-widest mb-3">Select Section</p>
                        <div className="flex flex-wrap gap-2">
                            {sectionList.map((s) => {
                                const isSecSelected = displaySection === s.section;
                                return (
                                    <button
                                        key={s.section}
                                        onClick={() => setSelectedSection(s.section)}
                                        className={`rounded-lg px-4 py-2 text-[13px] font-bold transition-all ${
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
                                        <th className="px-4 py-2 text-left text-[11px] font-black uppercase tracking-widest text-gray-400">Student</th>
                                        <th className="px-4 py-2 text-left text-[11px] font-black uppercase tracking-widest text-gray-400">Email</th>
                                        <th className="px-4 py-2 text-left text-[11px] font-black uppercase tracking-widest text-gray-400">Phone</th>
                                        <th className="px-4 py-2 text-left text-[11px] font-black uppercase tracking-widest text-gray-400">Points</th>
                                        <th className="px-4 py-2 text-left text-[11px] font-black uppercase tracking-widest text-gray-400">Items</th>
                                        <th className="px-4 py-2 text-left text-[11px] font-black uppercase tracking-widest text-gray-400 text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                        {currentSectionData.users.map((u, rowIdx) => (
                                        <tr key={u.id} className={`transition-colors hover:bg-blue-50/20 ${rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${accent.bg} ${accent.text} text-[10px] font-black`}>
                                                        {u.name ? u.name[0].toUpperCase() : u.email[0].toUpperCase()}
                                                    </div>
                                                    <span className="text-[13px] font-bold text-gray-900 truncate max-w-[120px]">{u.name || "Student"}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[12px] font-medium text-gray-500">{u.email}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-[12px] font-semibold text-gray-600 whitespace-nowrap">{u.phone}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="text-sm font-black text-emerald-600">{u.totalEarned.toLocaleString()}</span>
                                                <span className="ml-1 text-[10px] font-bold text-gray-400 uppercase">pts</span>
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-600">{u.totalItems}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter ${
                                                    u.status === "ACTIVE" 
                                                        ? "bg-[#16A34A] text-white" 
                                                        : "bg-gray-400 text-white"
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

