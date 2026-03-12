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
    if (c.includes("CS")) return { bg: "bg-blue-500/10", text: "text-blue-600", border: "border-blue-200", iconBg: "bg-blue-50" };
    if (c.includes("IT")) return { bg: "bg-indigo-500/10", text: "text-indigo-600", border: "border-indigo-200", iconBg: "bg-indigo-50" };
    if (c.includes("TM")) return { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-200", iconBg: "bg-emerald-50" };
    if (c.includes("HM")) return { bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-200", iconBg: "bg-orange-50" };
    if (c.includes("BECED")) return { bg: "bg-rose-500/10", text: "text-rose-600", border: "border-rose-200", iconBg: "bg-rose-50" };
    if (c.includes("BTLED")) return { bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-200", iconBg: "bg-amber-50" };
    if (c.includes("OAD")) return { bg: "bg-purple-500/10", text: "text-purple-600", border: "border-purple-200", iconBg: "bg-purple-50" };
    return { bg: "bg-gray-500/10", text: "text-gray-600", border: "border-gray-200", iconBg: "bg-gray-50" };
};

export default function UsersAccordion({ courses }: { courses: CourseGroup[] }) {
    // Keep track of opened nodes
    const [openCourses, setOpenCourses] = useState<Set<string>>(new Set([courses[0]?.course]));
    const [openYears, setOpenYears] = useState<Set<string>>(new Set());
    const [openSections, setOpenSections] = useState<Set<string>>(new Set());

    const toggleSet = (setFunc: React.Dispatch<React.SetStateAction<Set<string>>>, key: string) => {
        setFunc((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    if (!courses || courses.length === 0) {
        return (
            <div className="rounded-2xl border border-gray-100 bg-white px-6 py-12 text-center shadow-sm">
                <UserIcon className="mx-auto h-8 w-8 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500 font-medium">No students found.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {courses.map((courseGroup) => {
                const isCourseOpen = openCourses.has(courseGroup.course);
                const totalStudents = courseGroup.years.reduce((acc, y) => acc + y.sections.reduce((sAcc, s) => sAcc + s.users.length, 0), 0);
                const accent = getCourseAccent(courseGroup.course);
                
                return (
                    <div key={courseGroup.course} className={`overflow-hidden rounded-2xl border ${isCourseOpen ? accent.border : "border-gray-100"} bg-white transition-all duration-300`}>
                        {/* 1. Course Tier Header */}
                        <button
                            onClick={() => toggleSet(setOpenCourses, courseGroup.course)}
                            className={`flex w-full items-center justify-between px-6 py-5 transition-all hover:bg-gray-50/80 group ${isCourseOpen ? accent.bg : ""}`}
                        >
                            <div className="flex items-center gap-5">
                                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${accent.iconBg} transition-transform group-hover:scale-110 shadow-sm`}>
                                    <School className={`h-6 w-6 ${accent.text}`} />
                                </div>
                                <div className="text-left">
                                    <div className="flex items-center gap-2">
                                        <p className="text-lg font-bold text-gray-900">{courseGroup.course}</p>
                                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${accent.bg} ${accent.text} border ${accent.border}`}>
                                            Course
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        <span className="font-semibold text-gray-700">{totalStudents}</span> Students • <span className="font-semibold text-gray-700">{courseGroup.totalPoints}</span> Total Pts • <span className="font-semibold text-gray-700">{courseGroup.totalItems}</span> Items
                                    </p>
                                </div>
                            </div>
                            <div className={`rounded-xl p-2 transition-colors ${isCourseOpen ? accent.bg : "bg-gray-50"} group-hover:bg-opacity-80`}>
                                {isCourseOpen ? <ChevronDown className={`h-6 w-6 ${accent.text}`} /> : <ChevronRight className="h-6 w-6 text-gray-400" />}
                            </div>
                        </button>

                        {/* 2. Year Level Tier */}
                        {isCourseOpen && (
                            <div className={`border-t ${accent.border} bg-gray-50/30 divide-y divide-gray-100/50`}>
                                {courseGroup.years.map((yearGroup) => {
                                    const yearKey = `${courseGroup.course}-${yearGroup.yearLevel}`;
                                    const isYearOpen = openYears.has(yearKey);
                                    const yearStudents = yearGroup.sections.reduce((acc, s) => acc + s.users.length, 0);

                                    return (
                                        <div key={yearKey} className="pl-6 border-l-4 border-transparent hover:border-gray-200 transition-all">
                                            <button
                                                onClick={() => toggleSet(setOpenYears, yearKey)}
                                                className={`flex w-full items-center justify-between px-8 py-4 transition-all hover:bg-white/60 group mr-6 rounded-l-xl ${isYearOpen ? "bg-white/40 shadow-sm my-1" : ""}`}
                                            >
                                                <div className="flex items-center gap-3 text-left">
                                                    <div className={`h-2 w-2 rounded-full ${accent.text} bg-current opacity-40`} />
                                                    <div>
                                                        <p className="text-[14px] font-bold text-gray-800">{yearGroup.yearLevel}</p>
                                                        <p className="text-[11px] text-gray-500 font-medium">{yearStudents} Student{yearStudents !== 1 ? "s" : ""}</p>
                                                    </div>
                                                </div>
                                                <div className={`rounded-lg p-1 transition-colors ${isYearOpen ? "bg-gray-100" : "group-hover:bg-gray-50"}`}>
                                                    {isYearOpen ? <ChevronDown className="h-5 w-5 text-gray-500" /> : <ChevronRight className="h-5 w-5 text-gray-300" />}
                                                </div>
                                            </button>

                                            {/* 3. Section Tier */}
                                            {isYearOpen && (
                                                <div className="ml-10 mb-4 mr-6 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-50">
                                                    {yearGroup.sections.map((secGroup) => {
                                                        const secKey = `${yearKey}-${secGroup.section}`;
                                                        const isSecOpen = openSections.has(secKey);
                                                        
                                                        return (
                                                            <div key={secKey} className="group/sec">
                                                                <button
                                                                    onClick={() => toggleSet(setOpenSections, secKey)}
                                                                    className={`flex w-full items-center justify-between px-6 py-4 transition-all hover:bg-gray-50/50 ${isSecOpen ? "bg-gray-50/30" : ""}`}
                                                                >
                                                                    <div className="text-left">
                                                                        <p className="text-xs font-bold text-gray-700 uppercase tracking-tight">Section {secGroup.section}</p>
                                                                        <p className="text-[10px] text-gray-400 font-medium">{secGroup.users.length} Student{secGroup.users.length !== 1 ? "s" : ""}</p>
                                                                    </div>
                                                                    <div className={`rounded-md p-1 transition-colors ${isSecOpen ? "bg-gray-200/50" : "group-hover/sec:bg-gray-100"}`}>
                                                                        {isSecOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-300" />}
                                                                    </div>
                                                                </button>

                                                                {/* 4. Student Table Tier */}
                                                                {isSecOpen && (
                                                                    <div className="bg-white px-4 pb-4 pt-2">
                                                                        <div className="overflow-hidden rounded-lg border border-gray-100">
                                                                            <table className="min-w-full">
                                                                                <thead>
                                                                                    <tr className="bg-gray-50/80 border-b border-gray-100">
                                                                                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Student</th>
                                                                                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Points</th>
                                                                                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Items</th>
                                                                                        <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-gray-50">
                                                                                    {secGroup.users.map((u) => (
                                                                                        <tr key={u.id} className="transition-colors hover:bg-blue-50/30">
                                                                                            <td className="px-5 py-3">
                                                                                                <div className="flex items-center gap-3">
                                                                                                    <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${accent.bg} ${accent.text} text-[11px] font-black shadow-sm`}>
                                                                                                        {u.name ? u.name[0].toUpperCase() : u.email[0].toUpperCase()}
                                                                                                    </div>
                                                                                                    <div className="flex flex-col">
                                                                                                        <span className="text-[13px] font-bold text-gray-900 leading-tight">{u.name || "Student"}</span>
                                                                                                        <span className="text-[10px] font-medium text-gray-400 tracking-tight">{u.email}</span>
                                                                                                    </div>
                                                                                                </div>
                                                                                            </td>
                                                                                            <td className="px-5 py-3">
                                                                                                <span className="text-xs font-black text-emerald-600">{u.totalEarned.toLocaleString()}</span>
                                                                                                <span className="ml-1 text-[10px] font-bold text-gray-400 uppercase">pts</span>
                                                                                            </td>
                                                                                            <td className="px-5 py-3 text-xs font-bold text-gray-600">{u.totalItems}</td>
                                                                                            <td className="px-5 py-3">
                                                                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                                                                                    u.status === "ACTIVE" 
                                                                                                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                                                                                        : "bg-gray-50 text-gray-400 border border-gray-100"
                                                                                                }`}>
                                                                                                    <div className={`h-1 w-1 rounded-full ${u.status === "ACTIVE" ? "bg-emerald-500" : "bg-gray-400"}`} />
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
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
