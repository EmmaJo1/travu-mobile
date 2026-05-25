import React from 'react';

import {

  Image,

  StyleSheet,

  View,

  type ImageSourcePropType,

  type StyleProp,

  type ViewStyle,

} from 'react-native';

import Text from '@/components/common/AppText';



import { Colors, FontFamily } from '@/constants/theme';



export interface DateBadgeProps {

  date: string;

  day: string;

  imageUri?: string;

  image?: ImageSourcePropType;

  style?: StyleProp<ViewStyle>;

}



export default function DateBadge({ date, day, imageUri, image, style }: DateBadgeProps) {

  const imageSource = image ?? (imageUri ? { uri: imageUri } : undefined);



  return (

    <View style={[styles.container, style]}>

      {imageSource ? (

        <Image source={imageSource} style={styles.image} resizeMode="cover" />

      ) : (

        <View style={styles.fallback} />

      )}

      <View style={styles.glass}>

        <Text style={styles.date} numberOfLines={1}>

          {date}

        </Text>

        <Text style={styles.day} numberOfLines={1}>

          {day}

        </Text>

      </View>

    </View>

  );

}



const styles = StyleSheet.create({

  container: {

    width: 80,

    height: 60,

    borderRadius: 4,

    overflow: 'hidden',

  },

  image: {

    width: '100%',

    height: '100%',

  },

  fallback: {

    width: '100%',

    height: '100%',

    backgroundColor: '#5D5D5D',

  },

  glass: {

    position: 'absolute',

    left: 0,

    top: 0,

    width: 30,

    height: 40,

    borderRadius: 4,

    backgroundColor: 'rgba(255, 255, 255, 0.6)',

    overflow: 'hidden',

    alignItems: 'center',

  },

  date: {

    position: 'absolute',

    top: 6,

    width: '100%',

    fontFamily: FontFamily.pretendard,

    fontSize: 12,

    lineHeight: 16,

    color: Colors.foundation.black,

    textAlign: 'center',

  },

  day: {

    position: 'absolute',

    top: 22,

    width: '100%',

    fontFamily: FontFamily.pretendardMedium,

    fontSize: 10,

    lineHeight: 12,

    color: Colors.foundation.black,

    textAlign: 'center',

  },

});


