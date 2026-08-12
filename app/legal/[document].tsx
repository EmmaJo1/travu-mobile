import { Feather } from '@expo/vector-icons';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Text from '@/components/common/AppText';
import { LEGAL_DOCUMENTS, type LegalDocumentId } from '@/constants/legalDocuments';
import { Colors, Spacing, Typography } from '@/constants/theme';

function isLegalDocumentId(value: unknown): value is LegalDocumentId {
  return value === 'privacy-policy' || value === 'terms-of-service';
}

export default function LegalDocumentScreen() {
  const router = useRouter();
  const { document } = useLocalSearchParams<{ document?: string }>();

  if (!isLegalDocumentId(document)) {
    return <Redirect href="/settings" />;
  }

  const legalDocument = LEGAL_DOCUMENTS[document];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="뒤로가기"
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Feather name="chevron-left" size={28} color={Colors.foundation.black} />
        </Pressable>
        <Text style={styles.headerTitle}>{legalDocument.title}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.bodyText}>{legalDocument.content}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.foundation.white,
  },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.foundation.white,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.body1Emphasized,
    color: Colors.foundation.black,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['4xl'],
  },
  bodyText: {
    ...Typography.body2Regular,
    color: Colors.foundation.black,
  },
});
