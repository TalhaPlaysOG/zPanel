const fs = require('fs');
let code = fs.readFileSync('src/pages/SettingsPage.tsx', 'utf8');

// The new return block structure we want:
const newReturnTemplate = `  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full relative z-10"
    >
      <PageHeader 
        title="Settings" 
        subtitle="PREFERENCES" 
      />

      <div className="mx-auto max-w-7xl space-y-8 pb-12 px-4 md:px-0 mt-8">
        
        {/* 1. Account */}
        <div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <h2 className="text-xl font-bold mb-6 flex items-center text-foreground relative z-10">
            <User className="mr-3 text-indigo-400 w-5 h-5" /> Account
          </h2>
          <!--ACCOUNT_CONTENT-->
        </div>

        {/* 2. Branding (Admin only) */}
        {user.role === "admin" && (
          <div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <h2 className="text-xl font-bold mb-6 flex items-center text-foreground relative z-10">
              <Layout className="mr-3 text-indigo-400 w-5 h-5" /> Branding
            </h2>
            <!--BRANDING_CONTENT-->
          </div>
        )}

        {/* 3. Features (Admin only) */}
        {user.role === "admin" && (
          <div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <h2 className="text-xl font-bold mb-6 flex items-center text-foreground relative z-10">
              <RefreshCw className="mr-3 text-emerald-400 w-5 h-5" /> Features
            </h2>
            <div className="flex flex-col gap-6">
              <!--FEATURES_CONTENT-->
            </div>
          </div>
        )}

        {/* 4. Runtime (Admin only) */}
        {user.role === "admin" && (
          <div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <h2 className="text-xl font-bold mb-6 flex items-center text-foreground relative z-10">
              <Cpu className="mr-3 text-indigo-400 w-5 h-5" /> Runtime
            </h2>
            <!--RUNTIME_CONTENT-->
          </div>
        )}

        {/* 5. Authentication (Admin only) */}
        {user.role === "admin" && (
          <div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <h2 className="text-xl font-bold mb-6 flex items-center text-foreground relative z-10">
              <Key className="mr-3 text-amber-400 w-5 h-5" /> Authentication
            </h2>
            {renderGoogleFirebase()}
          </div>
        )}

        {/* 6. Appearance (Admin only) */}
        {user.role === "admin" && (
          <div className="bg-card/80 backdrop-blur-xl border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <h2 className="text-xl font-bold mb-6 flex items-center text-foreground relative z-10">
              <Image className="mr-3 text-indigo-400 w-5 h-5" /> Appearance
            </h2>
            <!--APPEARANCE_CONTENT-->
          </div>
        )}

        {/* 7. Users (Admin only) */}
        {user.role === "admin" && (
          <AdminControls user={user} users={users} username={username} setUsername={setUsername} password={password} setPassword={setPassword} role={role} setRole={setRole} isCreatingUser={isCreatingUser} createUser={createUser} editingUserId={editingUserId} setEditingUserId={setEditingUserId} adminUserNewPassword={adminUserNewPassword} setAdminUserNewPassword={setAdminUserNewPassword} changeUserPassword={changeUserPassword} deleteUser={deleteUser} />
        )}

        {/* 8. System Update (Admin only) */}
        {user.role === "admin" && (
          <div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center text-foreground">
              <RefreshCw className="mr-3 text-emerald-400 w-5 h-5" /> System Update
            </h2>
            <!--SYSTEM_CONTENT-->
          </div>
        )}
      </div>

      {selectedImage && (
        <ImageCropper
          imageSrc={selectedImage}
          onCropComplete={handleCropComplete}
          onCancel={() => { setSelectedImage(null); setCroppingType(null); }}
          aspectRatio={croppingType === "background" ? bgAspectRatio : 1}
          title={croppingType === "background" ? "Crop Background" : "Crop Logo"}
        />
      )}

      {(isProcessing || isUpdatingLogo || isSavingSettings || isChangingPassword || isCreatingUser || isUpdatingSystem) && <LoadingOverlay />}
    </motion.div>
  );`;

// Now let's extract the pieces using RegEx so it's flexible with whitespace.
// 1. Account
const accountMatch = code.match(/<div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10 mb-8">[\s\S]*?(?={\/\* Branding & Identity \*\/})/);
let accountContent = accountMatch ? accountMatch[0].trim() : "";

// 2. Branding
const brandingMatch = code.match(/{\/\* Branding & Identity \*\/}[\s\S]*?<h2[^>]*>[\s\S]*?<\/h2>\s*([\s\S]*?)\s*<\/div>\s*\{\/\* Platform Features \*\/\}/);
let brandingContent = brandingMatch ? brandingMatch[1].trim() : "";

// 3. Features
const featuresMatch = code.match(/{\/\* Platform Features \*\/}[\s\S]*?<h2[^>]*>[\s\S]*?<\/h2>\s*<div className="flex flex-col gap-6">\s*([\s\S]*?)\s*<\/div>\s*<\/div>\s*<\/div>/);
let featuresContent = featuresMatch ? featuresMatch[1].trim() : "";

// Extract Runtime out of Features
const runtimeMatch = featuresContent.match(/<div className="flex items-start justify-between py-4 border-b border-border-subtle group">[\s\S]*?<\/div>\s*<\/div>$/);
let runtimeContent = "";
if (runtimeMatch) {
    runtimeContent = runtimeMatch[0].trim();
    featuresContent = featuresContent.replace(runtimeContent, '').trim();
}

// 4. Appearance
const appearanceMatch = code.match(/<Layout className="mr-3 text-indigo-400 w-5 h-5" \/> Custom Dashboard Background[\s\S]*?<\/h2>\s*([\s\S]*?)\s*<\/div>\s*<\/div>\s*<\/div>\s*}\)\s*\{selectedImage/);
let appearanceContent = appearanceMatch ? appearanceMatch[1].trim() : "";
// Also check if we matched too much or too little, actually Custom Dashboard Background is:
const appearanceMatch2 = code.match(/Custom Dashboard Background\s*<\/h2>\s*([\s\S]*?)\s*<\/div>\s*<\/div>\s*<\/div>\s*}\)\s*{selectedImage/);
if (appearanceMatch2) appearanceContent = appearanceMatch2[1].trim();

// 5. System Update
const systemMatch = code.match(/System Update\s*<\/h2>\s*([\s\S]*?)\s*<\/div>\s*}\)\s*{\(isProcessing/);
let systemContent = systemMatch ? systemMatch[1].trim() : "";

// Modify renderGoogleFirebase to strip its outer `bg-card` and header since we provided our own now.
let preReturn = code.substring(0, code.indexOf('return ('));
// In renderGoogleFirebase, we want to strip the wrapper so it fits nicely in our new layout.
// Actually, it's easier to just strip the specific <h2 ...> Google & Firebase... </h2> and <div class="flex flex-col md:flex-row ... pb-6">
// Wait, renderGoogleFirebase has two branches: isDevPort3000 ? (...) : (...)
// Both have a header. Let's just keep renderGoogleFirebase as-is, BUT remove the outer <div class="bg-card..."> so it doesn't double-wrap.
preReturn = preReturn.replace(
  /<div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mt-8">/g,
  `<div className="">`
);
preReturn = preReturn.replace(
  /<div className="bg-card\/50 border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden mt-8 opacity-80">/g,
  `<div className="opacity-80">`
);
// Remove the {user.role === "admin" && ( ... )} around renderGoogleFirebase since we have it wrapped now.
preReturn = preReturn.replace(/\{user\.role === "admin" && \(/, '<>');
preReturn = preReturn.replace(/\)\}\s*<\/>/, '</>\n</>'); 
// Wait, regex might fail here. Let's not touch renderGoogleFirebase wrapper, and instead remove the `bg-card` wrapper from our new template for Authentication.

// Build final code
let newReturn = newReturnTemplate;
newReturn = newReturn.replace('<!--ACCOUNT_CONTENT-->', accountContent);
newReturn = newReturn.replace('<!--BRANDING_CONTENT-->', brandingContent);
newReturn = newReturn.replace('<!--FEATURES_CONTENT-->', featuresContent);
newReturn = newReturn.replace('<!--RUNTIME_CONTENT-->', runtimeContent);
newReturn = newReturn.replace('<!--APPEARANCE_CONTENT-->', appearanceContent);
newReturn = newReturn.replace('<!--SYSTEM_CONTENT-->', systemContent);

// Fix Authentication section to not double-wrap if renderGoogleFirebase has its own wrapper
newReturn = newReturn.replace(
  /{renderGoogleFirebase\(\)}\s*<\/div>/,
  `{renderGoogleFirebase()}\n        </div>`
);
// Actually, renderGoogleFirebase already has the auth headers. Let's just remove our auth header from the template!
newReturn = newReturn.replace(
  /<h2 className="text-xl font-bold mb-6 flex items-center text-foreground relative z-10">\s*<Key className="mr-3 text-amber-400 w-5 h-5" \/> Authentication\s*<\/h2>\s*{renderGoogleFirebase\(\)}/,
  `{renderGoogleFirebase()}`
);
newReturn = newReturn.replace(
  /{user\.role === "admin" && \(\s*<div className="bg-card border border-border-subtle rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">\s*{renderGoogleFirebase\(\)}\s*<\/div>\s*\)}/,
  `{renderGoogleFirebase()}`
);

fs.writeFileSync('src/pages/SettingsPage.tsx', preReturn + newReturn + '\n}');
console.log("Rewrite successful");
