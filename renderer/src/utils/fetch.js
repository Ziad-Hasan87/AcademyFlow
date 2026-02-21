import supabase from "./supabase";


export async function fetchDepartments(currentInstituteId, deptQuery, setDeptResults, setLoadingDepts) {
    setLoadingDepts(true);
    const { data, error } = await supabase
    .from("departments")
    .select("id, name, code")
    .eq("institute_id", currentInstituteId)
    .ilike("name", `%${deptQuery}%`);

    if (error) {
    console.error("Error fetching departments:", error);
    } else {
    setDeptResults(data);
    }
    setLoadingDepts(false);
};
export async function fetchPrograms(currentInstituteId, programQuery, setProgramResults, setLoadingPrograms) {
      setLoadingPrograms(true);
      const { data, error } = await supabase
        .from("programs")
        .select("id, name, departments(name)")
        .eq("institution_id", currentInstituteId)
        .eq("is_active", true)
        .ilike("name", `%${programQuery}%`);

      if (error) {
        console.error("Error fetching programs:", error);
      } else {
        setProgramResults(data);
      }
      setLoadingPrograms(false);
    };

export async function fetchOperations(programId, operationQuery, setOperationResults, setLoadingOperations) {
    setLoadingOperations(true);
    const { data, error } = await supabase
    .from("operations")
    .select("id, name, status, programs(name)")
    .eq("program_id", programId)
    .eq("status", "active")
    .ilike("name", `%${operationQuery}%`);

    if (error) {
    console.error("Error fetching operations:", error);
    } else {
    setOperationResults(data);
    }
    setLoadingOperations(false);
};

export async function fetchSlots(operationId, setSlots) {
    const { data, error } = await supabase
    .from("slotinfo")
    .select("*")
    .eq("operation_id", operationId)
    .order("serial_no");

    if (error) {
        console.error("Error fetching slots:", error);
    } else {
        setSlots(data || []);
    }
};

export async function fetchGroups(
  programId,
  groupQuery,
  setGroupResults,
  setLoadingGroups
) {
  if (!programId) return;

  setLoadingGroups(true);

  const { data, error } = await supabase
    .from("groups")
    .select("id, name, programs(name)")
    .eq("program_id", programId)
    .ilike("name", `%${groupQuery}%`);

  if (error) {
    console.error("Error fetching groups:", error);
  } else {
    setGroupResults(data);
  }

  setLoadingGroups(false);
}

export async function fetchSubgroups(groupId, subgroupQuery, setSubgroupResults, setLoadingSubgroups) {
    setLoadingSubgroups(true);
    const { data, error } = await supabase
    .from("subgroups")
    .select("id, name, groups(name)")
    .eq("group_id", groupId)
    .ilike("name", `%${subgroupQuery}%`);

    if (error) {
        console.error("Error fetching subgroups:", error);
        setLoadingSubgroups(false);
    } else {
        setSubgroupResults(data);
        setLoadingSubgroups(false);
    }
};

