package com.beatmaker.ai;

import android.graphics.Color;
import android.os.Bundle;
import android.view.Window;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        if (window != null) {
            int studioBg = Color.parseColor("#07070D");
            window.setStatusBarColor(studioBg);
            window.setNavigationBarColor(studioBg);
        }
    }
}
