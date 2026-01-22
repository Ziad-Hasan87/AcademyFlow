import { useState, useEffect } from "react";
import supabase from "../utils/supabase";
import { ROLES } from "../utils/types";
import { showToast } from "../utils/toast";

export default function CreateDepartments() {
    const currentInstituteId = localStorage.getItem("institute_id");

    const [form, setForm] = useState({
        code: "",
        name: "",
        institute_id: currentInstituteId || "",
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        const { error } = await supabase.from("departments").insert([
            {
                code: form.code,
                name: form.name,
                institute_id: form.institute_id,
            },
        ]);
            
        if (error.code === "23505") {
            alert("Department code already exists in this institute.");
            return;
        }
        showToast("Department created successfully");
    };
    return (
        <form onSubmit={handleSubmit} className="form">
            <h2 className="form-title">Create Department</h2>
            <div className="form-field">
                <label>Department Code</label>
                <input
                    className="form-input"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                    required
                />
            </div>

            <div className="form-field">
                <label>Department Name</label>
                <input
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                />
            </div>
            <div className="form-field">
                <label>Institute</label>
                <div
                    style={{
                    padding: "8px",
                    backgroundColor: "#f0f0f0",
                    color: "#555",
                    borderRadius: "4px",
                    fontStyle: "bold",
                    }}
                >
                    {localStorage.getItem("institute_name") || form.institute_id}
                </div>
            </div>
            <button type="submit" className="submit-button">
                Create Department
            </button>
        </form>
    );
}
    