import cucumber.api.java.Before;
import play.test.TestBrowser;
import play.test.TestServer;
import static play.test.Helpers.*;

public class GlobalHooks {
    public static int PORT = 3333;
    public static TestBrowser TEST_BROWSER;
    private static TestServer TEST_SERVER;
    private static boolean initialised = false;

    @Before
    public void before() {
//        if (!initialised) {
//            TEST_SERVER = testServer(PORT, fakeApplication(inMemoryDatabase()));
//            TEST_BROWSER = testBrowser(HTMLUNIT, PORT);
//            start(TEST_SERVER);
//            initialised = true;
//            Runtime.getRuntime().addShutdownHook(new Thread() {
//                @Override
//                public void run() {
//                    TEST_BROWSER.quit();
//                    TEST_SERVER.stop();
//                }
//            });
//        }
    }
}