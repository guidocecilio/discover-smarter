package graphite;

import java.io.OutputStream;
import java.io.PrintWriter;
import java.net.Socket;
import java.util.*;
import play.Play;

/**
 * Stats class for graphite 
 * @author waqar
 * push statistics to graphite server 
 */

public class Stats {
	private static HashMap<String, Integer> keys = new HashMap<String, Integer>();
	
	private static int getValue(String key){
		if (keys.get(key)!=null) keys.put(key,0);
		return keys.get(key)+1;
	}
	
	public static void increment(String key) {
		try {
			String host = Play.application().configuration().getString("graphite_host");
			int port = Integer.parseInt(Play.application().configuration().getString("graphite_port"));
			Socket socket = new Socket(host, port);
			OutputStream s = socket.getOutputStream();
			PrintWriter out = new PrintWriter(s, true);
			out.printf("%s %d %d%n",key,  getValue(key), System.currentTimeMillis() / 1000);	
			out.close();
			socket.close();
		} catch (Exception e) {
			System.err.println(e);
		} 
	}
}
