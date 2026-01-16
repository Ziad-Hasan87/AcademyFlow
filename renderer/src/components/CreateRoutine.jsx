import supabase from "../utils/supabase";

export default function CreateRoutineModal({ onClose }) {

  async function createInstitution(){
    
    const { data, error } = await supabase
      .from('institute')
      .insert([
        {  },
      ])
      .select()
            
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>Create Routine</h2>

        <button className="create-button" 
            onClick={createInstitution}>
              Create new Institution
            </button>
        <p>Routine creation form…</p>

        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
