import { useEffect, useState } from "react";
import supabase from "../utils/supabase";
import { showToast } from "../utils/toast";
import { useAuth } from "../contexts/AuthContext";
import { fetchPrograms } from "../utils/fetch";

export default function BotInfo() {
  const { userData } = useAuth();

  const [instituteBotId, setInstituteBotId] = useState("");
  const [loadingInstituteInfo, setLoadingInstituteInfo] = useState(false);
  const [savingInstitute, setSavingInstitute] = useState(false);

  const [programQuery, setProgramQuery] = useState("");
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);

  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [programChatId, setProgramChatId] = useState("");
  const [loadingProgramChatId, setLoadingProgramChatId] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);

  useEffect(() => {
    const loadInstituteBotId = async () => {
      if (!userData?.institute_id) return;

      setLoadingInstituteInfo(true);

      const { data, error } = await supabase
        .from("institutes")
        .select("botid")
        .eq("id", userData.institute_id)
        .single();

      if (error) {
        console.error("Error loading institute botid:", error);
      } else {
        setInstituteBotId(data?.botid || "");
      }

      setLoadingInstituteInfo(false);
    };

    loadInstituteBotId();
  }, [userData?.institute_id]);

  useEffect(() => {
    if (programQuery.trim() === "") {
      setPrograms([]);
      return;
    }

    fetchPrograms(
      userData?.institute_id,
      programQuery,
      setPrograms,
      setLoadingPrograms
    );
  }, [programQuery, userData?.institute_id]);

  const handleSaveInstituteBotId = async (e) => {
    e.preventDefault();

    if (!userData?.institute_id) {
      alert("Institute not found for current user.");
      return;
    }

    setSavingInstitute(true);

    const { error } = await supabase
      .from("institutes")
      .update({ botid: instituteBotId.trim() || null })
      .eq("id", userData.institute_id);

    setSavingInstitute(false);

    if (error) {
      alert(`Failed to update institute botid: ${error.message}`);
      return;
    }

    showToast("Institute botid updated");
  };

  const handlePickProgram = async (program) => {
    setSelectedProgramId(program.id);
    setProgramQuery(program.name);
    setPrograms([]);
    setLoadingProgramChatId(true);

    const { data, error } = await supabase
      .from("programs")
      .select("chat_id")
      .eq("id", program.id)
      .single();

    if (error) {
      console.error("Error loading program chat_id:", error);
      setProgramChatId("");
    } else {
      setProgramChatId(data?.chat_id || "");
    }

    setLoadingProgramChatId(false);
  };

  const handleSaveProgramChatId = async (e) => {
    e.preventDefault();

    if (!selectedProgramId) {
      alert("Please choose a program first.");
      return;
    }

    setSavingProgram(true);

    const { error } = await supabase
      .from("programs")
      .update({ chat_id: programChatId.trim() || null })
      .eq("id", selectedProgramId);

    setSavingProgram(false);

    if (error) {
      alert(`Failed to update program chat_id: ${error.message}`);
      return;
    }

    showToast("Program chat_id updated");
  };

  return (
    <div className="form" style={{ display: "grid", gap: "20px", padding: "5px" }}>
      <form onSubmit={handleSaveInstituteBotId} className="form">
        <h2 className="form-title">Institute BotID</h2>

        <div className="form-field">
          <label>Institute</label>
          <div
            style={{
              padding: "8px",
              backgroundColor: "#f0f0f0",
              color: "#555",
              borderRadius: "4px",
              fontWeight: "bold",
            }}
          >
            {userData?.institute_name || userData?.institute_id || "N/A"}
          </div>
        </div>

        <div className="form-field">
          <label>Bot ID</label>
          <input
            className="form-input"
            placeholder="Enter institute botid"
            value={instituteBotId}
            onChange={(e) => setInstituteBotId(e.target.value)}
            disabled={loadingInstituteInfo || savingInstitute}
          />
        </div>

        <button
          type="submit"
          className="form-submit"
          disabled={loadingInstituteInfo || savingInstitute}
        >
          {savingInstitute ? "Saving..." : "Save Institute BotID"}
        </button>
      </form>

      <form onSubmit={handleSaveProgramChatId} className="form">
        <h2 className="form-title">Program ChatID</h2>

        <div className="form-field autocomplete-container">
          <label>Program</label>
          <input
            className="form-input"
            value={programQuery}
            onChange={(e) => {
              setProgramQuery(e.target.value);
              setSelectedProgramId("");
              setProgramChatId("");
            }}
            onBlur={() => {
              setTimeout(() => setPrograms([]), 200);
            }}
            placeholder="Type program name..."
            required
          />

          {loadingPrograms && (
            <div className="autocomplete-loading">Searching...</div>
          )}

          {programs.length > 0 && (
            <div className="autocomplete-list">
              {programs.map((program) => (
                <div
                  key={program.id}
                  className="autocomplete-item"
                  onMouseDown={() => handlePickProgram(program)}
                >
                  {program.name}
                  {program.departments?.name && (
                    <span style={{ color: "#999", fontSize: "12px" }}>
                      {" "}
                      ({program.departments.name})
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="form-field">
          <label>Chat ID</label>
          <input
            className="form-input"
            placeholder="Enter program chat_id"
            value={programChatId}
            onChange={(e) => setProgramChatId(e.target.value)}
            disabled={!selectedProgramId || loadingProgramChatId || savingProgram}
            required
          />
        </div>

        <button
          type="submit"
          className="form-submit"
          disabled={!selectedProgramId || loadingProgramChatId || savingProgram}
        >
          {savingProgram ? "Saving..." : "Save Program ChatID"}
        </button>
      </form>
    </div>
  );
}