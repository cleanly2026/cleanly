import { View, Text, StyleSheet } from 'react-native'
import { useTranslation } from 'react-i18next'

export default function HomeScreen() {
  const { t } = useTranslation()

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('common.appName', 'Cleanly')}</Text>
      <Text style={styles.subtitle}>{t('common.tagline', 'On-demand cleaning services')}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#0d9488',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
})
