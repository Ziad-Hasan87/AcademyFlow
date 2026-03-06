import { useState, useEffect } from "react";
import supabase from "../utils/supabase";
import { ROLES } from "../utils/types";
import {
    fetchPrograms,
    fetchOperations,
    fetchGroups,
    fetchSubgroups,
    fetchDepartments,
} from "../utils/fetch";
import { useAuth } from "../contexts/AuthContext";

export default function BottomSidebar({ height, startDate, endDate, onEventsFetched }) {
    const { userData } = useAuth();
    const currentInstituteId = userData?.institute_id;

    const [filters, setFilters] = useState([
        {
            role: "",
            selectedProgram: "",
            operations: [],
            selectedOperation: "",
            groups: [],
            selectedGroup: "",
            subgroups: [],
            selectedSubgroup: "",
            selectedDepartment: "",
        },
    ]);

    const [programs, setPrograms] = useState([]);
    const [departments, setDepartments] = useState([]);

    // Load top-level dropdowns
    useEffect(() => {
        if (!currentInstituteId) return;
        fetchPrograms(currentInstituteId, "", setPrograms, () => {});
        fetchDepartments(currentInstituteId, "", setDepartments, () => {});
    }, [currentInstituteId]);

    const updateFilter = (index, key, value) => {
        setFilters((prev) => {
            const newFilters = [...prev];
            newFilters[index][key] = value;

            if (key === "selectedProgram") {
                newFilters[index].selectedOperation = "";
                newFilters[index].selectedGroup = "";
                newFilters[index].selectedSubgroup = "";
                newFilters[index].operations = [];
                newFilters[index].groups = [];
                newFilters[index].subgroups = [];
            } else if (key === "selectedGroup") {
                newFilters[index].selectedSubgroup = "";
                newFilters[index].subgroups = [];
            }

            return newFilters;
        });
    };

    useEffect(() => {
        filters.forEach((filter, index) => {
            if (filter.selectedProgram && filter.operations.length === 0) {
                fetchOperations(filter.selectedProgram, "", (ops) => {
                    setFilters((prev) => {
                        const newFilters = [...prev];
                        newFilters[index].operations = ops;
                        return newFilters;
                    });
                }, () => {});
            }

            if (filter.selectedProgram && filter.groups.length === 0) {
                fetchGroups(filter.selectedProgram, "", (grps) => {
                    setFilters((prev) => {
                        const newFilters = [...prev];
                        newFilters[index].groups = grps;
                        return newFilters;
                    });
                }, () => {});
            }

            if (filter.selectedGroup && filter.subgroups.length === 0) {
                fetchSubgroups(filter.selectedGroup, "", (subs) => {
                    setFilters((prev) => {
                        const newFilters = [...prev];
                        newFilters[index].subgroups = subs;
                        return newFilters;
                    });
                }, () => {});
            }
        });
    }, [filters]);

    const addFilterRow = () => {
        setFilters((prev) => [
            ...prev,
            {
                role: "",
                selectedProgram: "",
                operations: [],
                selectedOperation: "",
                groups: [],
                selectedGroup: "",
                subgroups: [],
                selectedSubgroup: "",
                selectedDepartment: "",
            },
        ]);
    };

    const deleteFilterRow = (index) => {
        if (index === 0) return;
        setFilters((prev) => prev.filter((_, i) => i !== index));
    };

    const fetchEventsForFilter = async (filter) => {
        const { role, selectedProgram, selectedOperation, selectedGroup, selectedSubgroup, selectedDepartment } = filter;
        let events = [];

        try {
            if (role === "Student") {
                if (selectedSubgroup) {
                    console.log(`Fetching events for Subgroup ID: ${selectedSubgroup}`);
                    const { data, error } = await supabase.rpc("get_events_for_subgroup", { subgroup_uuid: selectedSubgroup, start_date: startDate, end_date: endDate });
                    if (error) throw error;
                    events = data;
                } else if (selectedGroup) {
                    console.log(`Fetching events for Group ID: ${selectedGroup}`);
                    const { data, error } = await supabase.rpc("get_events_for_group", { group_uuid: selectedGroup, start_date: startDate, end_date: endDate });
                    if (error) throw error;
                    events = data;
                } else if (selectedOperation) {
                    console.log(`Fetching events for Operation ID: ${selectedOperation}`);
                    const { data, error } = await supabase.rpc("get_events_for_operation", { operation_uuid: selectedOperation, start_date: startDate, end_date: endDate });
                    if (error) throw error;
                    events = data;
                } else if (selectedProgram) {
                    console.log(`Fetching events for Program ID: ${selectedProgram}`);
                    const { data, error } = await supabase.rpc("get_events_for_program", { program_uuid: selectedProgram, start_date: startDate, end_date: endDate });
                    if (error) throw error;
                    events = data;
                }
            }

            if (role === "Staff" && selectedDepartment) {
                console.log(`Fetching events for Staff in Department ID: ${selectedDepartment}`);
                const { data: staffUsers, error: staffError } = await supabase.from("staffs").select("id").eq("department_id", selectedDepartment);
                if (staffError) throw staffError;

                if (staffUsers && staffUsers.length > 0) {
                    const { data, error } = await supabase.from("events").select("*").in("for_users", staffUsers.map(u => u.id));
                    if (error) throw error;
                    events = data;
                }
            }

            return events || [];
        } catch (err) {
            console.error("Error fetching events for filter:", err);
            return [];
        }
    };

    const applyAllFilters = async () => {
        let allEvents = [];
        for (const filter of filters) {
            const events = await fetchEventsForFilter(filter);
            allEvents = [...allEvents, ...events];
        }
        const uniqueEvents = Array.from(new Map(allEvents.map(ev => [ev.id, ev])).values());
        if (typeof onEventsFetched === "function") onEventsFetched(uniqueEvents);
        console.log(`Total events after union: ${uniqueEvents.length}`);
    };

    return (
        <div className="sidebar-bottom" style={{ height: `${height}px`, overflowY: "auto", padding: "10px" }}>
            <h3>Event Filters</h3>
            {filters.map((filter, index) => (
                <div key={index} className="autocomplete-container" style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "10px", width: "100%" }}>
                    <div className="form-field" style={{ flex: 1 }}>
                        <select className="form-select" value={filter.role} onChange={(e) => updateFilter(index, "role", e.target.value)}>
                            <option value="">Select Role</option>
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    {filter.role === "Student" && (
                        <>
                            <div className="form-field" style={{ flex: 1 }}>
                                <select className="form-select" value={filter.selectedProgram} onChange={(e) => updateFilter(index, "selectedProgram", e.target.value)}>
                                    <option value="">Program</option>
                                    {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="form-field" style={{ flex: 1 }}>
                                <select className="form-select" value={filter.selectedOperation} onChange={(e) => updateFilter(index, "selectedOperation", e.target.value)} disabled={!filter.selectedProgram}>
                                    <option value="">Operation</option>
                                    {filter.operations.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                            </div>
                            <div className="form-field" style={{ flex: 1 }}>
                                <select className="form-select" value={filter.selectedGroup} onChange={(e) => updateFilter(index, "selectedGroup", e.target.value)} disabled={!filter.selectedProgram}>
                                    <option value="">Group</option>
                                    {filter.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                            <div className="form-field" style={{ flex: 1 }}>
                                <select className="form-select" value={filter.selectedSubgroup} onChange={(e) => updateFilter(index, "selectedSubgroup", e.target.value)} disabled={!filter.selectedGroup}>
                                    <option value="">Subgroup</option>
                                    {filter.subgroups.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </>
                    )}

                    {filter.role === "Staff" && (
                        <div className="form-field" style={{ flex: 1 }}>
                            <select className="form-select" value={filter.selectedDepartment} onChange={(e) => updateFilter(index, "selectedDepartment", e.target.value)}>
                                <option value="">Department</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                    )}

                    {index > 0 && (
                        <button className="form-delete" onClick={() => deleteFilterRow(index)} style={{ height: "35px" }}>
                            Delete
                        </button>
                    )}
                </div>
            ))}

            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
                <button className="form-cancel" onClick={addFilterRow}>Add Filter</button>
                <button className="form-submit" onClick={applyAllFilters}>Apply Filters</button>
            </div>
        </div>
    );
}