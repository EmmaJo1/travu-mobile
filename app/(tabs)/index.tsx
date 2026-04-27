import { StyleSheet, Text, View } from "react-native";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>TRAVEL JOURNAL APP</Text>
      <Text style={styles.title}>Travu</Text>
      <Text style={styles.description}>
        여행의 순간을 기록하고 다시 꺼내보는 모바일 앱
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF8F4",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 12,
    letterSpacing: 3,
    color: "#8A8178",
    marginBottom: 12,
  },
  title: {
    fontSize: 44,
    fontWeight: "600",
    color: "#1C1917",
  },
  description: {
    marginTop: 20,
    fontSize: 16,
    lineHeight: 24,
    color: "#57534E",
    textAlign: "center",
  },
});