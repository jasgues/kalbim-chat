const fs = require("fs");
const file = "app/(tabs)/index.tsx";
let text = fs.readFileSync(file, "utf8");
const old = '<Pressable onPress={logout} style={({ pressed }) => [{ height: 38, borderRadius: 20, backgroundColor: "#f8dce2", paddingHorizontal: 14, justifyContent: "center" }, pressed && { opacity: 0.7 }]}><Text className="text-xs font-semibold text-[#c75a72]">Çıkış</Text></Pressable>';
const next = '<View className="flex-row items-center gap-2"><Pressable onPress={clearMessages} style={({ pressed }) => [{ height: 38, borderRadius: 20, backgroundColor: "#f9e4e8", paddingHorizontal: 12, justifyContent: "center" }, pressed && { opacity: 0.7 }]}><Text className="text-xs font-semibold text-[#c75a72]">Temizle</Text></Pressable>' + old + '</View>';
if (!text.includes(old)) throw new Error("logout button not found");
text = text.replace(old, next);
fs.writeFileSync(file, text);
