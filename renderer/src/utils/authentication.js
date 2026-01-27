import supabase from "./supabase";

export async function createUser({
  email,
  password,
  role,
  institute_id,
}) {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: email,
    password,
  });

  if (authError) throw authError;

  const userId = authData.user.id;

  // 2. Insert into public.users table
  const { error: dbError } = await supabase
    .from("users")
    .insert([
      {
        id: userId,
        role,
        institute_id
      },
    ]);

  if (dbError) throw dbError;

  return authData.user;
}

/* ----------------------------------
   Log In
---------------------------------- */
export async function logIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password,
  });

  if (error) throw error;

  return data.user;
}

/* ----------------------------------
   Log Out
---------------------------------- */
export async function logOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getUserProfile() {
  const { data: { user }, error } = await supabase.auth.getUser();
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select(`
      role,
      institute_id,
      institutes!inner(name)
    `)
    .eq("id", user.id)
    .single();
  
  if (profileError) throw profileError;
  
  const userData = {
    id: user.id,
    email: user.email,
    role: profile.role,
    institute_id: profile.institute_id,
    institute_name: profile.institutes?.name || "Unknown Institute"
  };
  return userData;
}
/* ----------------------------------
   Get Current User (Auth + Profile)
---------------------------------- */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Fetch public profile
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) throw profileError;

  return {
    ...user,
    profile,
  };
}
