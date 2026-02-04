import { useState, useEffect } from "react";
import supabase from "../utils/supabase";
import { useAuth } from "../contexts/AuthContext";
import { showToast } from "../utils/toast";

export default function CreateVacations({ onSuccess }) {
    const { userData } = useAuth();
    const currentInstituteId = userData?.institute_id;

    const [forType, setForType] = useState("all");
    const [idQuery, setIdQuery] = useState("");
    const [idResults, setIdResults] = useState([]);
    const [selectedId, setSelectedId] = useState(null);

    const [programQuery, setProgramQuery] = useState("");
    const [programResults, setProgramResults] = useState([]);
    const [selectedProgram, setSelectedProgram] = useState(null);

    const [operationQuery, setOperationQuery] = useState("");
    const [operationResults, setOperationResults] = useState([]);
    const [selectedOperation, setSelectedOperation] = useState(null);

    const [startDay, setStartDay] = useState("");
    const [endDay, setEndDay] = useState("");
    const [description, setDescription] = useState("");

    /** SEARCH PROGRAMS **/
    useEffect(() => {
        if (forType === "operations" && programQuery.trim() !== "") {
            supabase
                .from("programs")
                .select("id, name")
                .eq("institution_id", currentInstituteId)
                .ilike("name", `%${programQuery}%`)
                .then(({ data }) => setProgramResults(data || []));
        } else setProgramResults([]);
    }, [programQuery, forType, currentInstituteId]);

    /** SEARCH OPERATIONS **/
    useEffect(() => {
        if (forType === "operations" && selectedProgram && operationQuery.trim() !== "") {
            supabase
                .from("operations")
                .select("id, name")
                .eq("program_id", selectedProgram.id)
                .ilike("name", `%${operationQuery}%`)
                .then(({ data }) => setOperationResults(data || []));
        } else setOperationResults([]);
    }, [operationQuery, selectedProgram, forType]);

    // SEARCH DEPARTMENTS / PROGRAMS FOR ID FIELD
    useEffect(() => {
        if (forType === "programs" && idQuery.trim() !== "") {
            supabase
                .from("programs")
                .select("id, name")
                .eq("institution_id", currentInstituteId)
                .ilike("name", `%${idQuery}%`)
                .then(({ data }) => setIdResults(data || []));
        }
        else if (forType === "departments" && idQuery.trim() !== "") {
            supabase
                .from("departments")
                .select("id, name")
                .eq("institute_id", currentInstituteId)  // Corrected: use institute_id
                .ilike("name", `%${idQuery}%`)
                .then(({ data }) => setIdResults(data || []));
        }
        else {
            setIdResults([]);
        }
    }, [idQuery, forType, currentInstituteId]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        let forUsers = null;
        let fromTable = forType;

        if (forType === "all") forUsers = currentInstituteId;
        else if (forType === "programs" || forType === "departments") forUsers = selectedId;
        else if (forType === "operations") forUsers = selectedOperation?.id;

        if (!forUsers) return alert("Please select a value for Id/Operation");

        const { error } = await supabase.from("vacations").insert([
            {
                start_day: startDay,
                end_day: endDay,
                description,
                from_table: fromTable,
                for_users: forUsers,
                institute_id: currentInstituteId,
            },
        ]);

        if (error) {
            alert("Failed to create vacation: " + error.message);
        } else {
            showToast("Vacation created successfully!");
            // Reset
            setForType("all");
            setIdQuery("");
            setSelectedId(null);
            setProgramQuery("");
            setSelectedProgram(null);
            setOperationQuery("");
            setSelectedOperation(null);
            setStartDay("");
            setEndDay("");
            setDescription("");
            onSuccess();
        }
    };

    return (
        <form className="form" onSubmit={handleSubmit}>
            <h2 className="form-title">Create Vacation</h2>

            <div className="form-field">
                <label>For:</label>
                <select
                    className="form-select"
                    value={forType}
                    onChange={(e) => {
                        setForType(e.target.value);
                        setIdQuery("");
                        setSelectedId(null);
                        setProgramQuery("");
                        setSelectedProgram(null);
                        setOperationQuery("");
                        setSelectedOperation(null);
                    }}
                >
                    <option value="all">All</option>
                    <option value="programs">Programs</option>
                    <option value="departments">Departments</option>
                    <option value="operations">Operations</option>
                </select>
            </div>

            {/* Program/Department search */}
            {(forType === "programs" || forType === "departments") && (
                <div className="form-field autocomplete-container">
                    <label>Name:</label>
                    <input
                        className="form-input"
                        placeholder={`Search ${forType}...`}
                        value={idQuery}
                        onChange={(e) => {
                            setIdQuery(e.target.value);
                            setSelectedId(null);
                        }}
                        onBlur={() => setTimeout(() => setIdResults([]), 200)}
                    />
                    {idResults.length > 0 && (
                        <div className="autocomplete-list">
                            {idResults.map((item) => (
                                <div
                                    key={item.id}
                                    className="autocomplete-item"
                                    onMouseDown={() => {
                                        setIdQuery(item.name);
                                        setSelectedId(item.id);
                                        setIdResults([]);
                                    }}
                                >
                                    {item.name}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Operations: program → operation selection */}
            {forType === "operations" && (
                <>
                    <div className="form-field autocomplete-container">
                        <label>Program:</label>
                        <input
                            className="form-input"
                            placeholder="Search program..."
                            value={programQuery}
                            onChange={(e) => {
                                setProgramQuery(e.target.value);
                                setSelectedProgram(null);
                                setSelectedOperation(null);
                                setOperationQuery("");
                            }}
                            onBlur={() => setTimeout(() => setProgramResults([]), 200)}
                        />
                        {programResults.length > 0 && (
                            <div className="autocomplete-list">
                                {programResults.map((prog) => (
                                    <div
                                        key={prog.id}
                                        className="autocomplete-item"
                                        onMouseDown={() => {
                                            setProgramQuery(prog.name);
                                            setSelectedProgram(prog);
                                            setProgramResults([]);
                                            setSelectedOperation(null);
                                            setOperationQuery("");
                                        }}
                                    >
                                        {prog.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="form-field autocomplete-container">
                        <label>Operation:</label>
                        <input
                            className="form-input"
                            placeholder="Search operation..."
                            value={operationQuery}
                            onChange={(e) => {
                                setOperationQuery(e.target.value);
                                setSelectedOperation(null);
                            }}
                            onBlur={() => setTimeout(() => setOperationResults([]), 200)}
                            disabled={!selectedProgram}
                        />
                        {operationResults.length > 0 && (
                            <div className="autocomplete-list">
                                {operationResults.map((op) => (
                                    <div
                                        key={op.id}
                                        className="autocomplete-item"
                                        onMouseDown={() => {
                                            setOperationQuery(op.name);
                                            setSelectedOperation(op);
                                            setOperationResults([]);
                                        }}
                                    >
                                        {op.name}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            <div className="form-field">
                <label>Start Day:</label>
                <input
                    type="date"
                    className="form-input"
                    value={startDay}
                    onChange={(e) => setStartDay(e.target.value)}
                    required
                />
            </div>

            <div className="form-field">
                <label>End Day:</label>
                <input
                    type="date"
                    className="form-input"
                    value={endDay}
                    onChange={(e) => setEndDay(e.target.value)}
                    required
                />
            </div>

            <div className="form-field">
                <label>Description:</label>
                <textarea
                    className="form-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            <button type="submit" className="form-submit">
                Create Vacation
            </button>
        </form>
    );
}
