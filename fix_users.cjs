const fs = require('fs');

let code = fs.readFileSync('src/pages/AdminSettingsPage.tsx', 'utf8');

const regex = /{activeTab === "users" && \(\s*<div>\s*<\/div>\s*\)}/;
if (regex.test(code)) {
    code = code.replace(regex, `{activeTab === "users" && (
                    <div>
                        <AdminControls 
                            user={user}
                            users={users}
                            username={newUsername}
                            setUsername={setNewUsername}
                            password={newUserPassword}
                            setPassword={setNewUserPassword}
                            role={newUserRole}
                            setRole={setNewUserRole}
                            isCreatingUser={isCreatingUser}
                            createUser={createUser}
                            editingUserId={editingUserId}
                            setEditingUserId={setEditingUserId}
                            adminUserNewPassword={adminUserNewPassword}
                            setAdminUserNewPassword={setAdminUserNewPassword}
                            changeUserPassword={changeUserPassword}
                            deleteUser={deleteUser}
                        />
                    </div>
                  )}`);
    fs.writeFileSync('src/pages/AdminSettingsPage.tsx', code);
    console.log("Fixed!");
} else {
    console.log("Regex did not match");
}
